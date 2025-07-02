/* eslint-disable max-depth */
/* eslint-disable max-lines */
// @ts-expect-error linting to be updated
import { NotifyClient } from "notifications-node-client";
import { EmailResponse } from "../models/EmailResponse";
import { GovNotifyErrorMapper } from "./GovNotifyErrorMapper";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
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
import { PdfPreferenceEnum } from "../utils/PdfPreferenceEnum";

/**
 * Class to send emails using gov notify service
 */
export class SendToGovNotifyService {

  private readonly govNotifyErrorMapper: GovNotifyErrorMapper;

  private static instance: SendToGovNotifyService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

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
  	metrics: Metrics,
  	GOVUKNOTIFY_API_KEY: string,
  	govnotifyServiceId: string,
  ) {
  	this.logger = logger;
  	this.metrics = metrics;
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
		this.metrics,
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
  	metrics: Metrics,
  	GOVUKNOTIFY_API_KEY: string,
  	govnotifyServiceId: string,
  ): SendToGovNotifyService {
  	if (!this.instance) {
  		this.instance = new SendToGovNotifyService(
  			logger,
  			metrics,
  			GOVUKNOTIFY_API_KEY,
  			govnotifyServiceId,
  		);
  	}
  	return this.instance;
  }

  async sendYotiInstructions(sessionId: string): Promise<EmailResponse> {
  	// Fetch the Yoti PDF from S3
  	try {
  		this.logger.info("checking service has redeployed");
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
		
  		const govNotify = new NotifyClient(
  			clientConfig.GovNotifyApi,
  			this.GOV_NOTIFY_SERVICE_ID,
  			this.GOVUKNOTIFY_API_KEY,
  		);

  		if (f2fPersonInfo.pdfPreference === PdfPreferenceEnum.PRINTED_LETTER) {
  			this.metrics.addMetric("SendToGovNotify_opted_for_printed_letter", MetricUnits.Count, 1);
  			try {
  				const mergedPdf = await this.fetchPdfFile(f2fSessionInfo, this.environmentVariables.mergedLetterBucketPDFFolder());
				  this.metrics.addMetric("SendToGovNotify_fetched_merged_pdf", MetricUnits.Count, 1);

  				if (mergedPdf) {
  					this.logger.debug("sendLetter", SendToGovNotifyService.name);
  					this.logger.info("Sending precompiled letter");

  					await this.sendGovNotificationLetter(
  						mergedPdf,
  						referenceId,
  						govNotify,
  					);

  					await this.sendF2FLetterSentEvent(f2fSessionInfo, f2fPersonInfo);
  				}
  			} catch (err: any) {
  				this.logger.error("sendYotiInstructions - Cannot send letter", {
  					message: err, messageCode: MessageCodes.FAILED_TO_SEND_PDF_LETTER,
  				});
  				this.metrics.addMetric("SendToGovNotify_notify_letter_failed_generic_error", MetricUnits.Count, 1);
  			}
  		}
		
  		const instructionsPdf = await this.fetchPdfFile(f2fSessionInfo, this.environmentVariables.yotiLetterBucketPDFFolder());

  		if (instructionsPdf) {
  			this.metrics.addMetric("SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);

  			this.logger.debug("sendEmail", SendToGovNotifyService.name);
  			this.logger.info("Sending Yoti PDF email");

			  const encoded = Buffer.from(instructionsPdf, "binary").toString(
  				"base64",
  			);

  			const formattedDate = this.formatExpiryDate(f2fSessionInfo);

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
  						retention_period: "3 weeks",
  					},
  				},
  				reference: referenceId,
  			};

  			const emailResponse = await this.sendGovNotificationEmail(
  				this.environmentVariables.getPdfEmailTemplateId(this.logger),
  				f2fPersonInfo,
  				govNotify,
  				options,
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
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
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
  				differentPostalAddress: f2fPersonInfo.addresses.length > 1,
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
  	govNotify: NotifyClient,
  	options: any,
  ): Promise<EmailResponse> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.info("sendEmail - trying to send email message", {
  			templateId: this.environmentVariables.getPdfEmailTemplateId(
  				this.logger,
  			),
  			referenceId: options.reference,
  			retryCount,
  		});
  		try {
  			const emailResponse = await govNotify.sendEmail(
  				templateId,
  				f2fPersonInfo.emailAddress,
  				options,
  			);

  			const { data } = emailResponse;

  			this.logger.info(
  				"sendEmail - response status after sending Email",
  				SendToGovNotifyService.name,
  				emailResponse.status,
  			);
  			this.logger.info("Email notification_id = " + data.id);

  			this.metrics.addMetric("SendToGovNotify_email_sent_successfully", MetricUnits.Count, 1);

  			const singleMetric = this.metrics.singleMetric();
  			singleMetric.addDimension("status_code", emailResponse.status.toString());
  			singleMetric.addMetric("SendToGovNotify_notify_email_response", MetricUnits.Count, 1);
  			const serviceResponse = new EmailResponse(
  				new Date().toISOString(),
  				"",
  				emailResponse.status,
  				emailResponse.data.id,
  			);
  			return serviceResponse;
  		} catch (err: any) {
  			this.logger.error("sendEmail - GOV UK Notify threw an error");

  			if (err.response) {
  				this.logger.error(`GOV UK Notify error: ${err}`, {
  					statusCode: err.response.data.status_code,
  					errors: err.response.data.errors,
  				});
  				const singleMetric = this.metrics.singleMetric();
  				singleMetric.addDimension("status_code", err.response.data.status_code.toString());
  				singleMetric.addMetric("SendToGovNotify_notify_email_response", MetricUnits.Count, 1);
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
  				this.logger.error(
  					`sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`,
  				);
  				this.metrics.addMetric("SendToGovNotify_email_sent_failed_all_attempts", MetricUnits.Count, 1);
  				throw appError;
  			}
  		}
  	}

  	// Never gets hit unless while is broken
  	throw new AppError(
  		HttpCodesEnum.SERVER_ERROR,
  		`sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`,
  	);
  }

  async sendGovNotificationLetter(
  	pdf: any,
  	referenceId: string,
  	govNotify: NotifyClient,
  ): Promise<any> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.info("sendletter - trying to send letter message", {
  			referenceId: `${referenceId}-letter`,
  			retryCount,
  		});

  		try {
  			const letterResponse = await govNotify.sendPrecompiledLetter(`${referenceId}-letter`, pdf);
  			const { data } = letterResponse;

  			this.logger.info("Letter notification_id = " + data.id);

  			const singleMetric = this.metrics.singleMetric();
  			singleMetric.addDimension("status_code", letterResponse.status.toString());
  			singleMetric.addMetric("SendToGovNotify_notify_letter_response", MetricUnits.Count, 1);

  			this.metrics.addMetric("SendToGovNotify_letter_sent_successfully", MetricUnits.Count, 1);

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

				  this.logger.error("sendYotiInstructions - Cannot send letter", err.response.data.errors);
				  const singleMetric = this.metrics.singleMetric();
				  singleMetric.addDimension("status_code", err.response.data.status_code.toString());
				  singleMetric.addMetric("SendToGovNotify_notify_letter_response", MetricUnits.Count, 1);
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

  formatExpiryDate(f2fSessionInfo: ISessionItem): string {
  	const createdDate = f2fSessionInfo.createdDate;
  	const expiryDate = createdDate + 15 * 86400;
	
  	const dateObject = new Date(expiryDate * 1000);
  	const formattedDate = dateObject.toLocaleDateString("en-GB", { month: "long", day: "numeric" });
  	return formattedDate;
  }
}
