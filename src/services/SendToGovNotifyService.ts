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
import { PdfPreferenceEmail } from "../models/PdfPreferenceEmail";
import { fetchEncodedFile } from "../utils/S3Client";

/**
 * Class to send emails using gov notify service
 */
export class SendToGovNotifyService {
  private govNotify: NotifyClient;

  private govNotifyErrorMapper: GovNotifyErrorMapper;

  private static instance: SendToGovNotifyService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly f2fService: F2fService;

  private readonly GOV_NOTIFY_SERVICE_ID: string;

  private readonly GOVUKNOTIFY_API_KEY: string;

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

  async sendYotiInstructions(pdfPreferenceDetails: PdfPreferenceEmail): Promise<EmailResponse> {
  	// Fetch the instructions pdf from Yoti
  	try {
  		const f2fSessionInfo = await this.f2fService.getSessionById(
			pdfPreferenceDetails.sessionId,
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

  		if (pdfPreferenceDetails.pdfPreference === Constants.PDF_PREFERENCE_PRINTED_LETTER) {

  			const mergedPdf = await this.fetchMergedPdf(pdfPreferenceDetails);

  			if (mergedPdf) {
  				this.logger.debug("sendLetter", SendToGovNotifyService.name);
  				this.logger.info("Sending precomplied letter");

  			await this.sendGovNotificationLetter(
  				mergedPdf,
  				pdfPreferenceDetails,
  				clientConfig.GovNotifyApi,
  			);

  			await this.sendF2FLetterSentEvent(pdfPreferenceDetails);
  			}
  		}
		
  		const instructionsPdf = await this.fetchYotiPdf(pdfPreferenceDetails);

  		if (instructionsPdf) {
  			this.logger.debug("sendEmail", SendToGovNotifyService.name);
  			this.logger.info("Sending Yoti PDF email");

  			const { GOV_NOTIFY_OPTIONS } = Constants;

  			const options = {
  				personalisation: {
  					[GOV_NOTIFY_OPTIONS.FIRST_NAME]: pdfPreferenceDetails.firstName,
  					[GOV_NOTIFY_OPTIONS.LAST_NAME]: pdfPreferenceDetails.lastName,
  					[GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: {
  						file: instructionsPdf,
  						confirm_email_before_download: true,
  						retention_period: "2 weeks",
  					},
  				},
  				reference: pdfPreferenceDetails.referenceId,
  			};

  			const emailResponse = await this.sendGovNotificationEmail(
  				this.environmentVariables.getPdfEmailTemplateId(this.logger),
  				pdfPreferenceDetails,
  				options,
  				clientConfig.GovNotifyApi,
  			);

  			await this.sendF2FYotiEmailedEvent(pdfPreferenceDetails);
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
  			messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiInstructions - Cannot send Email",
  		);
  	}
  }

  async fetchYotiPdf(pdfPreferenceDetails: PdfPreferenceEmail): Promise<any> {
	const f2fSessionInfo = await this.f2fService.getSessionById(pdfPreferenceDetails.sessionId);

	if (!f2fSessionInfo) {
		this.logger.warn("Missing details in SESSION table", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
	}  		
		
	const bucket = this.environmentVariables.yotiLetterBucket();
	const folder = this.environmentVariables.yotiPdfBucketFolder();
	const key = `${folder}/${pdfPreferenceDetails.yotiSessionId}`; 
	
	return await fetchEncodedFile(bucket, key);
  }

  async fetchMergedPdf(pdfPreferenceDetails: PdfPreferenceEmail): Promise<any> {
  	const f2fSessionInfo = await this.f2fService.getSessionById(pdfPreferenceDetails.sessionId);
	if (!f2fSessionInfo) {
		this.logger.warn("Missing details in SESSION table", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
	} 		 		


  	const bucket = this.environmentVariables.yotiLetterBucket();
  	const folder = this.environmentVariables.mergedPdfBucketFolder();
  	const key = `${folder}/${pdfPreferenceDetails.yotiSessionId}`;
		
  	return await fetchEncodedFile(bucket, key);
  }


  async sendF2FYotiEmailedEvent(pdfPreferenceDetails: PdfPreferenceEmail): Promise<void> {
  	const session = await this.f2fService.getSessionById(pdfPreferenceDetails.sessionId);
  	if (session != null) {
  		const coreEventFields = buildCoreEventFields(
  			session,
  			this.environmentVariables.issuer(),
  			session.clientIpAddress,
  		);
  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: TxmaEventNames.F2F_YOTI_PDF_EMAILED,
  				...coreEventFields,
  				extensions: {
  					evidence: [
  						{
  							txn: session.yotiSessionId || "",
  						},
  					],
  				},
  				user: {
  					...coreEventFields.user,
  					email: pdfPreferenceDetails.emailAddress,
  					govuk_signin_journey_id: session.clientSessionId,
  				},
  			});
  		} catch (error) {
  			this.logger.error(
  				"Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.",
  			);
  		}
  	} else {
  		this.logger.error(
  			"Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ",
  			pdfPreferenceDetails.sessionId,
  		);
  	}
  }

  async sendF2FLetterSentEvent(pdfPreferenceDetails: PdfPreferenceEmail): Promise<void> {
  	const session = await this.f2fService.getSessionById(pdfPreferenceDetails.sessionId);
  	if (session != null) {
  		const coreEventFields = buildCoreEventFields(
  			session,
  			this.environmentVariables.issuer(),
  			session.clientIpAddress,
  		);
  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: TxmaEventNames.F2F_YOTI_PDF_LETTER_POSTED,
  				...coreEventFields,
  				extensions: {
  					evidence: [
  						{
  							txn: session.yotiSessionId || "",
  						},
  					],
  				},
  				user: {
  					...coreEventFields.user,
  					email: pdfPreferenceDetails.emailAddress,
  					govuk_signin_journey_id: session.clientSessionId,
  				},
				  restricted: {
					postalAddress: pdfPreferenceDetails.postalAddress,
  				},
  			});
  		} catch (error) {
  			this.logger.error(
  				"Failed to write TXMA event F2F_YOTI_PDF_LETTER_POSTED to SQS queue.",
  			);
  		}
  	} else {
  		this.logger.error(
  			"Failed to write TXMA event F2F_YOTI_PDF_LETTER_POSTED to SQS queue, session not found for sessionId: ",
  			pdfPreferenceDetails.sessionId,
  		);
  	}
  }

  /**
   * Method to compose send email request
   * This method receive object containing the data to compose the email and retrieves needed field based on object type (PdfPreferenceEmail)
   * it attempts to send the email.
   * If there is a failure, it checks if the error is retryable. If it is, it retries for the configured max number of times with a cool off period after each try.
   * If the error is not retryable, an AppError is thrown
   * If max number of retries is exceeded an AppError is thrown
   *
   * @param pdfPreferenceDetails
   * @returns EmailResponse
   * @throws AppError
   */
  async sendGovNotificationEmail(
  	templateId: string,
  	pdfPreferenceDetails: PdfPreferenceEmail,
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
  			referenceId: pdfPreferenceDetails.referenceId,
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
  				pdfPreferenceDetails.emailAddress,
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
  			this.logger.error("sendEmail - GOV UK Notify threw an error");

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

   /**
   * Method to compose send printed letter to govNotify 
   * This method receive object containing the data to compose the PrecompiledLetter and retrieves needed field based on object type (PdfPreferenceEmail)
   * it attempts to send the PrecompiledLetter.
   * If there is a failure, it checks if the error is retryable. If it is, it retries for the configured max number of times with a cool off period after each try.
   * If the error is not retryable, an AppError is thrown
   * If max number of retries is exceeded an AppError is thrown
   *
   * @param pdfPreferenceDetails
   * @returns EmailResponse
   * @throws AppError
   */

  async sendGovNotificationLetter(
  	pdf: any,
  	message: PdfPreferenceEmail,
  	GovNotifyApi: string,
  ): Promise<any> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.debug("sendletter - trying to send letter message", {
  			referenceId: `${message.referenceId}-letter`,
  			retryCount,
  		});

  		try {
  			this.govNotify = new NotifyClient(
  				GovNotifyApi,
  				this.GOV_NOTIFY_SERVICE_ID,
  				this.GOVUKNOTIFY_API_KEY,
  			);
  			const letterResponse = await this.govNotify.sendPrecompiledLetter(`${message.referenceId}-letter`, pdf)
			  .then((res: any) => {
				  return res;
				  })
				  .catch((err: any) => this.logger.error("sendYotiInstructions - Cannot send letter", err.response.data.errors));

  			this.logger.debug(
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
