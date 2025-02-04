/* eslint-disable max-depth */
/* eslint-disable max-lines */
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { EmailResponse } from "../models/EmailResponse";
import { GovNotifyErrorMapper } from "./GovNotifyErrorMapper";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { sleep } from "../utils/Sleep";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { F2fService } from "./F2fService";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { Constants } from "../utils/Constants";
import { getClientConfig } from "../utils/ClientConfig";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { fetchEncodedFileFromS3Bucket } from "../utils/S3Client";
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { ISessionItem } from "../models/ISessionItem";
import { PersonIdentityItem } from "../models/PersonIdentityItem";
import { randomUUID } from "crypto";

/**
 * Class to send emails using gov notify service
 */
export class SendToGovNotifyService {
  private govNotify: NotifyClient;

  private readonly govNotifyErrorMapper: GovNotifyErrorMapper;

  private static instance: SendToGovNotifyService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly f2fService: F2fService;

  private readonly GOV_NOTIFY_SERVICE_ID: string;

  private readonly GOVUKNOTIFY_API_KEY: string;

  private readonly s3Client: S3Client;

  /**
   * Constructor sets up the client needed to use gov notify service with API key read from env var
   *
   * @param environmentVariables
   * @private
   */
  private constructor(
  	logger: Logger,
  	GOVUKNOTIFY_API_KEY: string,
  	govnotifyServiceId: string,
  ) {
  	this.logger = logger;
  	this.environmentVariables = new EnvironmentVariables(
  		logger,
  		ServicesEnum.GOV_NOTIFY_SERVICE,
  	);
  	this.GOV_NOTIFY_SERVICE_ID = govnotifyServiceId;
  	this.GOVUKNOTIFY_API_KEY = GOVUKNOTIFY_API_KEY;
  	this.govNotifyErrorMapper = new GovNotifyErrorMapper();
  	this.f2fService = F2fService.getInstance(
  		this.environmentVariables.sessionTable(),
  		this.logger,
  		createDynamoDbClient(),
  	);
	  this.s3Client = new S3Client({
  		region: process.env.REGION,
  		maxAttempts: 2,
  		requestHandler: new NodeHttpHandler({
  			connectionTimeout: 29000,
  			socketTimeout: 29000,
  		}),
  	});
  }

  static getInstance(
  	logger: Logger,
  	GOVUKNOTIFY_API_KEY: string,
  	govnotifyServiceId: string,
  ): SendToGovNotifyService {
  	if (!this.instance) {
  		this.instance = new SendToGovNotifyService(
  			logger,
  			GOVUKNOTIFY_API_KEY,
  			govnotifyServiceId,
  		);
  	}
  	return this.instance;
  }

  async sendYotiInstructions(sessionId: string): Promise<EmailResponse> {
  	// Fetch the Yoti PDF from S3
  	try {
  		const f2fSessionInfo = await this.f2fService.getSessionById(
  			sessionId,
  		);

  		if (!f2fSessionInfo) {
  			this.logger.warn("Missing details in SESSION table", {
  				messageCode: MessageCodes.SESSION_NOT_FOUND,
  			});
  			throw new AppError(
  				HttpCodesEnum.BAD_REQUEST,
  				"Missing details in SESSION or table",
  			);
  		}
  		const clientConfig = getClientConfig(
  			this.environmentVariables.clientConfig(),
  			f2fSessionInfo.clientId,
  			this.logger,
  		);
			
  		if (!clientConfig) {
  			this.logger.error("Unrecognised client in request", {
  				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
  			});
  			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Bad Request");
  		}

  		const f2fPersonInfo = await this.f2fService.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
		
		  if (!f2fPersonInfo) {
  			this.logger.warn("Missing details in PERSON table", {
  				messageCode: MessageCodes.PERSON_NOT_FOUND,
  			});
  			throw new AppError(
  				HttpCodesEnum.BAD_REQUEST,
  				"Missing details in PERSON table",
  			);
  		}

  		const referenceId = randomUUID();

  		if (f2fPersonInfo.pdfPreference === Constants.PDF_PREFERENCE_PRINTED_LETTER) {
  			try {
  				const mergedPdf = await this.fetchPdfFile(f2fSessionInfo, this.environmentVariables.mergedLetterBucketPDFFolder());
				 
  				if (mergedPdf) {
  					this.logger.debug("sendLetter", SendToGovNotifyService.name);
  					this.logger.info("Sending precompiled letter");

					
  					await this.sendGovNotificationLetter(
  						mergedPdf,
  						referenceId,
  						clientConfig.GovNotifyApi,
  					);
  					await this.sendF2FLetterSentEvent(f2fSessionInfo, f2fPersonInfo);
  				}

  			} catch (err: any) {
  				this.logger.error("sendYotiInstructions - Cannot send letter", {
  					message: err, messageCode: MessageCodes.FAILED_TO_SEND_PDF_LETTER,
  				});
  			}
  		}
		
  		const instructionsPdf = await this.fetchPdfFile(f2fSessionInfo, this.environmentVariables.yotiLetterBucketPDFFolder());

  		if (instructionsPdf) {
  			this.logger.debug("sendEmail", SendToGovNotifyService.name);
  			this.logger.info("Sending Yoti PDF email");

			  const encoded = Buffer.from(instructionsPdf, "binary").toString(
  				"base64",
  			);

  			const dateObject = new Date(f2fSessionInfo.expiryDate * 1000);
  			const formattedDate = dateObject.toLocaleDateString("en-GB", { month: "long", day: "numeric" });

  			const { GOV_NOTIFY_OPTIONS } = Constants;

  			const lastNameIndex = f2fPersonInfo.name[0].nameParts.length - 1;

  			const options = {
  				personalisation: {
  					[GOV_NOTIFY_OPTIONS.FIRST_NAME]: f2fPersonInfo.name[0].nameParts[0].value,
  					[GOV_NOTIFY_OPTIONS.LAST_NAME]: f2fPersonInfo.name[0].nameParts[lastNameIndex].value,
  					[GOV_NOTIFY_OPTIONS.DATE]: formattedDate,
  					[GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: {
  						file: encoded,
  						confirm_email_before_download: true,
  						retention_period: "2 weeks",
  					},
  				},
  				reference: referenceId,
  			};

  			const emailResponse = await this.sendGovNotificationEmail(
  				this.environmentVariables.getPdfEmailTemplateId(this.logger),
  				f2fPersonInfo,
  				options,
  				clientConfig.GovNotifyApi,
  			);

  			await this.sendF2FYotiEmailedEvent(f2fSessionInfo, f2fPersonInfo);
  			return emailResponse;
  		} else {
  			this.logger.error("Failed to fetch the Instructions pdf", {
  				messageCode: MessageCodes.FAILED_FETCHING_YOTI_PDF,
  			});
  			throw new AppError(
  				HttpCodesEnum.SERVER_ERROR,
  				"sendYotiInstructions - Failed to fetch the Instructions pdf",
  			);
  		}
  	} catch (err: any) {
  		this.logger.error("sendYotiInstructions - Cannot send Email", {
  			message: err, messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiInstructions - Cannot send Email",
  		);
  	}
  }

  async fetchPdfFile(f2fSessionInfo: ISessionItem, folderName: string | undefined): Promise<any> {
  	const bucket = this.environmentVariables.yotiLetterBucketName();
  	const folder = folderName;
  	const key = `${folder}-${f2fSessionInfo.yotiSessionId}`; 

  	this.logger.info("Fetching the pdf file from the S3 bucket. ", { bucket, key }); 
  	try {
  		return await fetchEncodedFileFromS3Bucket(this.s3Client, bucket, key);
  	} catch (error) {
  		this.logger.error({ message: "Error fetching the pdf file from S3 bucket", error, messageCode: MessageCodes.ERROR_FETCHING_PDF_FILE_FROM_S3_BUCKET });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching the pdf file from S3 bucket");
  	}	
	
  }

  async sendF2FYotiEmailedEvent(f2fSessionInfo: ISessionItem, f2fPersonInfo: PersonIdentityItem): Promise<void> {
  		const coreEventFields = buildCoreEventFields(
  			f2fSessionInfo,
  			this.environmentVariables.issuer(),
  			f2fSessionInfo.clientIpAddress,
  		);
  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: TxmaEventNames.F2F_YOTI_PDF_EMAILED,
  				...coreEventFields,
  				extensions: {
  					evidence: [
  						{
  							txn: f2fSessionInfo.yotiSessionId ?? "",
  						},
  					],
  				},
  				user: {
  					...coreEventFields.user,
  					email: f2fPersonInfo.emailAddress,
  					govuk_signin_journey_id: f2fSessionInfo.clientSessionId,
  				},
  			});
  		} catch (error) {
  			this.logger.error(
  				"Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.",
  			);
  		}
  }

  async sendF2FLetterSentEvent(f2fSessionInfo: ISessionItem, f2fPersonInfo: PersonIdentityItem): Promise<void> {
  		const coreEventFields = buildCoreEventFields(
  			f2fSessionInfo,
  			this.environmentVariables.issuer(),
  			f2fSessionInfo.clientIpAddress,
  		);
  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: TxmaEventNames.F2F_YOTI_PDF_LETTER_POSTED,
  				...coreEventFields,
  				extensions: {
  					evidence: [
  						{
  							txn: f2fSessionInfo.yotiSessionId ?? "",
  						},
  					],
  				},
  				user: {
  					...coreEventFields.user,
  					email: f2fPersonInfo.emailAddress,
  					govuk_signin_journey_id: f2fSessionInfo.clientSessionId,
  				},
				  restricted: {
  					postalAddress: f2fPersonInfo.addresses.filter(address => address.preferredAddress === true),
  				},
  			});
  		} catch (error) {
  			this.logger.error(
  				"Failed to write TXMA event F2F_YOTI_PDF_LETTER_POSTED to SQS queue, session not found for sessionId: ",
  			f2fSessionInfo.sessionId,
  			);
  		}
  }

  async sendGovNotificationEmail(
  	templateId: string,
  	f2fPersonInfo: PersonIdentityItem,
  	options: any,
  	GovNotifyApi: string,
  ): Promise<EmailResponse> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.debug("sendEmail - trying to send email message", {
  			templateId: this.environmentVariables.getPdfEmailTemplateId(
  				this.logger,
  			),
  			referenceId: options.reference,
  			retryCount,
  		});
  		try {
  			this.govNotify = new NotifyClient(
  				GovNotifyApi,
  				this.GOV_NOTIFY_SERVICE_ID,
  				this.GOVUKNOTIFY_API_KEY,
  			);
  			const emailResponse = await this.govNotify.sendEmail(
  				templateId,
  				f2fPersonInfo.emailAddress,
  				options,
  			);
  			this.logger.debug(
  				"sendEmail - response status after sending Email",
  				SendToGovNotifyService.name,
  				emailResponse.status,
  			);
  			return new EmailResponse(
  				new Date().toISOString(),
  				"",
  				emailResponse.status,
  			);
  		} catch (err: any) {
  			this.logger.error("sendEmail - GOV UK Notify threw an error", err);

  			if (err.response) {
  				this.logger.error(`GOV UK Notify error: ${err}`, {
  					statusCode: err.response.data.status_code,
  					errors: err.response.data.errors,
  				});
  			}

  			const appError: any = this.govNotifyErrorMapper.map(
  				err.response.data.status_code,
  				err.response.data.errors[0].message,
  			);

  			if (
  				appError.obj!.shouldRetry &&
          retryCount < this.environmentVariables.maxRetries()
  			) {
  				this.logger.error(
  					`sendEmail - Mapped error ${SendToGovNotifyService.name}`,
  					{ appError },
  				);
  				this.logger.error(
  					`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${
  						SendToGovNotifyService.name
  					} ${new Date().toISOString()}`,
  					{ retryCount },
  				);
  				await sleep(this.environmentVariables.backoffPeriod());
  				retryCount++;
  			} else {
  				throw appError;
  			}
  		}
  	}
  	this.logger.error(
  		`sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`,
  	);
  	throw new AppError(
  		HttpCodesEnum.SERVER_ERROR,
  		`sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`,
  	);
  }

  async sendGovNotificationLetter(
  	pdf: any,
  	referenceId: string,
  	GovNotifyApi: string,
  ): Promise<any> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.info("sendletter - trying to send letter message", {
  			referenceId: `${referenceId}-letter`,
  			retryCount,
  		});

  		try {
  			this.govNotify = new NotifyClient(
  				GovNotifyApi,
  				this.GOV_NOTIFY_SERVICE_ID,
  				this.GOVUKNOTIFY_API_KEY,
  			);

  			const letterResponse = await this.govNotify.sendPrecompiledLetter(`${referenceId}-letter`, pdf)
			  .then((res: any) => {
				  return res;
				  })
				  .catch((err: any) => this.logger.error("sendYotiInstructions - Cannot send letter", err.response.data.errors));
				  

  			this.logger.info(
  				"sendLetter - response status after sending letter",
  				SendToGovNotifyService.name,
  				letterResponse.status,
  			);
  			return letterResponse.status;
  		} catch (err: any) {
  			this.logger.error("sendLetter- GOV UK Notify threw an error");

  			if (err.response) {
  				this.logger.error(`GOV UK Notify error ${SendToGovNotifyService.name}`, {
  					statusCode: err.response.data.status_code,
  					errors: err.response.data.errors,
  				});
  			}

  			const appError: any = this.govNotifyErrorMapper.map(
  				err.response.data.status_code,
  				err.response.data.errors[0].message,
  			);

  			if (
  				appError.obj!.shouldRetry &&
          retryCount < this.environmentVariables.maxRetries()
  			) {
  				this.logger.error(
  					`sendLetter - Mapped error ${SendToGovNotifyService.name}`,
  					{ appError },
  				);
  				this.logger.error(
  					`sendLetter- Retrying to send the letter. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${
  						SendToGovNotifyService.name
  					} ${new Date().toISOString()}`,
  					{ retryCount },
  				);
  				await sleep(this.environmentVariables.backoffPeriod());
  				retryCount++;
  			} else {
  				throw appError;
  			}
  		}
  	}
  	this.logger.error(
  		`sendLetter - Cannot send Letter after ${this.environmentVariables.maxRetries()} retries`,
  	);
  	throw new AppError(
  		HttpCodesEnum.SERVER_ERROR,
  		`sendLetter - Cannot send Letter after ${this.environmentVariables.maxRetries()} retries`,
  	);
  }
}
