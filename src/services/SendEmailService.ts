 
// @ts-expect-error linting to be updated
import { NotifyClient } from "notifications-node-client";

import { EmailResponse } from "../models/EmailResponse";
import { Email } from "../models/Email";
import { DynamicReminderEmail } from "../models/DynamicReminderEmail";
import { GovNotifyErrorMapper } from "./GovNotifyErrorMapper";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { sleep } from "../utils/Sleep";
import { YotiService } from "./YotiService";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { F2fService } from "./F2fService";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { ReminderEmail } from "../models/ReminderEmail";
import { MessageCodes } from "../models/enums/MessageCodes";
import { Constants } from "../utils/Constants";
import { getClientConfig } from "../utils/ClientConfig";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { ValidationHelper } from "../utils/ValidationHelper";
import { ISessionItem } from "../models/ISessionItem";

/**
 * Class to send emails using gov notify service
 */
export class SendEmailService {

  private govNotifyErrorMapper: GovNotifyErrorMapper;

  private static instance: SendEmailService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

	private readonly validationHelper: ValidationHelper;

  private yotiService!: YotiService;

  private readonly f2fService: F2fService;

  private readonly YOTI_PRIVATE_KEY: string;

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
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
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
  	this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
  	this.validationHelper = new ValidationHelper();
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  	GOVUKNOTIFY_API_KEY: string,
  	govnotifyServiceId: string,
  ): SendEmailService {
  	if (!this.instance) {
  		this.instance = new SendEmailService(
  			logger,
  			metrics,
  			YOTI_PRIVATE_KEY,
  			GOVUKNOTIFY_API_KEY,
  			govnotifyServiceId,
  		);
  	}
  	return this.instance;
  }

  /**
   * Method to compose send email request
   * This method receive object containing the data to compose the email and retrieves needed field based on object type (Email | EmailMessage)
   * it attempts to send the email.
   * If there is a failure, it checks if the error is retryable. If it is, it retries for the configured max number of times with a cool off period after each try.
   * If the error is not retryable, an AppError is thrown
   * If max number of retries is exceeded an AppError is thrown
   *
   * @param message
   * @returns EmailResponse
   * @throws AppError
   */
  async sendYotiPdfEmail(message: Email): Promise<EmailResponse> {
  	try {
  		const sessionConfigObject = await this.fetchSessionAndConfigInfo(message.sessionId);

  		const encoded = await this.fetchInstructionsPdf(
  			message,
  			sessionConfigObject.clientConfig.YotiBaseUrl,
  		);
  		if (encoded) {
  			this.logger.debug("sendEmail", SendEmailService.name);
  			this.logger.info("Sending Yoti PDF email");

  			const formattedDate = this.formatExpiryDate(sessionConfigObject.f2fSessionInfo);

  			const { GOV_NOTIFY_OPTIONS } = Constants;

  			const options = {
  				personalisation: {
  					[GOV_NOTIFY_OPTIONS.FIRST_NAME]: message.firstName,
  					[GOV_NOTIFY_OPTIONS.LAST_NAME]: message.lastName,
  					[GOV_NOTIFY_OPTIONS.DATE]: formattedDate,
  					[GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: {
  						file: encoded,
  						confirm_email_before_download: true,
  						retention_period: "2 weeks",
  					},
  				},
  				reference: message.referenceId,
  			};

  			const emailResponse = await this.sendGovNotification(
  				this.environmentVariables.getPdfEmailTemplateId(this.logger),
  				message,
  				options,
  				sessionConfigObject.clientConfig.GovNotifyApi,
  			);
  			await this.sendF2FYotiEmailedEvent(message);
  			return emailResponse;
  		} else {
  			this.logger.error("Failed to fetch the Instructions pdf", {
  				messageCode: MessageCodes.FAILED_FETCHING_YOTI_PDF,
  			});
  			throw new AppError(
  				HttpCodesEnum.SERVER_ERROR,
  				"sendYotiPdfEmail - Failed to fetch the Instructions pdf",
  			);
  		}
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
  	} catch (err: any) {
  		this.logger.error("sendYotiPdfEmail - Cannot send Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiPdfEmail - Cannot send Email",
  		);
  	}
  }

  async sendReminderEmail(message: ReminderEmail): Promise<EmailResponse> {
  	this.logger.info("Sending reminder email");

  	try {
  		const sessionConfigObject = await this.fetchSessionAndConfigInfo(message.sessionId);

  		const encoded = await this.fetchInstructionsPdf(
  			message,
  			sessionConfigObject.clientConfig.YotiBaseUrl,
  		);

  		const formattedDate = this.formatExpiryDate(sessionConfigObject.f2fSessionInfo);

  		const { GOV_NOTIFY_OPTIONS } = Constants;

  		const options = {
  			personalisation: {
  				[GOV_NOTIFY_OPTIONS.DATE]: formattedDate,
  				[GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: {
  					file: encoded,
  					confirm_email_before_download: true,
  					retention_period: "2 weeks",
  				},
  			},
  			reference: message.referenceId,
  		};

  		const emailResponse = await this.sendGovNotification(
  			this.environmentVariables.getReminderEmailTemplateId(this.logger),
  			message,
  			options,
  			sessionConfigObject.clientConfig.GovNotifyApi,
  		);
  		return emailResponse;
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
  	} catch (err: any) {
  		this.logger.error("Failed to send Reminder Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_REMINDER_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendReminderEmail - Failed sending Reminder Email",
  		);
  	}
  }

  async sendDynamicReminderEmail(
  	message: DynamicReminderEmail,
  ): Promise<EmailResponse> {
  	this.logger.info("Sending dynamic reminder email");

  	try {
  		const sessionConfigObject = await this.fetchSessionAndConfigInfo(message.sessionId);

  		const encoded = await this.fetchInstructionsPdf(
  			message,
  			sessionConfigObject.clientConfig.YotiBaseUrl,
  		);

  		const { GOV_NOTIFY_OPTIONS } = Constants;

  		const formattedDate = this.formatExpiryDate(sessionConfigObject.f2fSessionInfo);

  	
  		const options = {
  			personalisation: {
  				[GOV_NOTIFY_OPTIONS.FIRST_NAME]: message.firstName,
  				[GOV_NOTIFY_OPTIONS.LAST_NAME]: message.lastName,
  				[GOV_NOTIFY_OPTIONS.DATE]: formattedDate,
  				[GOV_NOTIFY_OPTIONS.CHOSEN_PHOTO_ID]: message.documentUsed,
				  [GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: {
  					file: encoded,
  					confirm_email_before_download: true,
  					retention_period: "2 weeks",
  				},
  			},
  			reference: message.referenceId,
  		};

  		const emailResponse = await this.sendGovNotification(
  			this.environmentVariables.getDynamicReminderEmailTemplateId(
  				this.logger,
  			),
  			message,
  			options,
  			sessionConfigObject.clientConfig.GovNotifyApi,
  		);
  		return emailResponse;
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
  	} catch (err: any) {
  		this.logger.error("Failed to send Dynamic Reminder Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_REMINDER_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendReminderEmail - Failed sending Dynamic Reminder Email",
  		);
  	}
  }

  async sendF2FYotiEmailedEvent(message: Email): Promise<void> {
  	const session = await this.f2fService.getSessionById(message.sessionId);
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
  					email: message.emailAddress,
  					govuk_signin_journey_id: session.clientSessionId,
  				},
  			});
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
  		} catch (error) {
  			this.logger.error(
  				"Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.",
  			);
  		}
  	} else {
  		this.logger.error(
  			"Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ",
  			message.sessionId,
  		);
  	}
  }

  async sendGovNotification(
  	templateId: string,
  	message: Email | DynamicReminderEmail | ReminderEmail,
  	options: any,
  	GovNotifyApi: string,
  ): Promise<EmailResponse> {
  	let retryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (retryCount <= this.environmentVariables.maxRetries()) {
  		this.logger.info("sendEmail - trying to send email message", {
  			templateId: this.environmentVariables.getPdfEmailTemplateId(
  				this.logger,
  			),
  			referenceId: message.referenceId,
  			retryCount,
  		});

  		try {
  			const govNotify = new NotifyClient(
  				GovNotifyApi,
  				this.GOV_NOTIFY_SERVICE_ID,
  				this.GOVUKNOTIFY_API_KEY,
  			);
  			const emailResponse = await govNotify.sendEmail(
  				templateId,
  				message.emailAddress,
  				options,
  			);
  			this.logger.debug(
  				"sendEmail - response status after sending Email",
  				SendEmailService.name,
  				emailResponse.status,
  			);
  			return new EmailResponse(
  				new Date().toISOString(),
  				"",
  				emailResponse.status,
  				emailResponse.data.id,
  			);
  		} catch (err: any) {
  			this.logger.error("sendEmail - GOV UK Notify threw an error");

  			if (err.response) {
  				this.logger.error(`GOV UK Notify error ${SendEmailService.name}`, {
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
  					`sendEmail - Mapped error ${SendEmailService.name}`,
  					{ appError },
  				);
  				this.logger.error(
  					`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${
  						SendEmailService.name
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

  async fetchInstructionsPdf(
  	message: Email | DynamicReminderEmail | ReminderEmail,
  	yotiBaseUrl: string,
  ): Promise<string> {
  	if (!this.validationHelper.checkRequiredYotiVars) throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
  	let yotiInstructionsPdfRetryCount = 0;
  	//retry for maxRetry count configured value if fails
  	while (
  		yotiInstructionsPdfRetryCount <=
      this.environmentVariables.yotiInstructionsPdfMaxRetries()
  	) {
  		this.logger.info(
  			"Fetching the Instructions Pdf from yoti for sessionId: ",
  			message.yotiSessionId,
  		);
  		try {
  			this.logger.info("BASE_URL", yotiBaseUrl);
  			this.yotiService = YotiService.getInstance(
  				this.logger,
  				this.metrics,
  				this.YOTI_PRIVATE_KEY,
  			);
  			const instructionsPdf = await this.yotiService.fetchInstructionsPdf(
  				message.yotiSessionId,
  				yotiBaseUrl,
  			);
  			if (instructionsPdf) {
  				const encoded = Buffer.from(instructionsPdf, "binary").toString(
  					"base64",
  				);
  				return encoded;
  			}
  		} catch (err: any) {
  			this.logger.error(
  				"Error while fetching Instructions pdf or encoding the pdf.",
  				{ err },
  			);
  			if (
  				(err.statusCode === 500 || err.statusCode === 429) &&
          yotiInstructionsPdfRetryCount <
            this.environmentVariables.yotiInstructionsPdfMaxRetries()
  			) {
  				this.logger.error(
  					`sendEmail - Retrying to fetch the Instructions Pdf from yoti for sessionId : ${
  						message.yotiSessionId
  					}. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${
  						SendEmailService.name
  					} ${new Date().toISOString()}`,
  					{ yotiInstructionsPdfRetryCount },
  				);
  				await sleep(
  					this.environmentVariables.yotiInstructionsPdfBackoffPeriod(),
  				);
  				yotiInstructionsPdfRetryCount++;
  			} else {
  				throw err;
  			}
  		}
  	}
  	this.logger.error(
  		`sendEmail - Could not fetch Instructions pdf after ${this.environmentVariables.yotiInstructionsPdfMaxRetries()} retries`,
  	);
  	throw new AppError(
  		HttpCodesEnum.SERVER_ERROR,
  		`sendEmail - Could not fetch Instructions pdf after ${this.environmentVariables.yotiInstructionsPdfMaxRetries()} retries`,
  	);
  }

  formatExpiryDate(f2fSessionInfo: ISessionItem): string {
  	const createdDate = f2fSessionInfo.createdDate;
  	const expiryDate = createdDate + 15 * 86400;
	  
  	const dateObject = new Date(expiryDate * 1000);
  	const formattedDate = dateObject.toLocaleDateString("en-GB", { month: "long", day: "numeric" });
  	return formattedDate;
  }

  async fetchSessionAndConfigInfo(sessionId: string): Promise<any> {
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

  	const sessionConfigObject = {
  		f2fSessionInfo,
  		clientConfig,
  	};

  	return sessionConfigObject;
  }
}
