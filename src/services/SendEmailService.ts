// @ts-ignore
import { NotifyClient } from "notifications-node-client";

import { EmailResponse } from "../models/EmailResponse";
import { Email } from "../models/Email";
import { GovNotifyErrorMapper } from "./GovNotifyErrorMapper";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { sleep } from "../utils/Sleep";
import { YotiService } from "./YotiService";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { F2fService } from "./F2fService";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { ReminderEmail } from "../models/ReminderEmail";
import { DynamicReminderEmail } from "../models/DynamicReminderEmail";
import { MessageCodes } from "../models/enums/MessageCodes";
import { Constants } from "../utils/Constants";


/**
 * Class to send emails using gov notify service
 */
export class SendEmailService {

    private govNotify: NotifyClient;

    private govNotifyErrorMapper: GovNotifyErrorMapper;

    private static instance: SendEmailService;

    private readonly environmentVariables: EnvironmentVariables;

    private readonly logger: Logger;

	private yotiService: YotiService;

	private readonly f2fService: F2fService;

	/**
	 * Constructor sets up the client needed to use gov notify service with API key read from env var
	 *
	 * @param environmentVariables
	 * @private
	 */
	private constructor(logger: Logger, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string) {
    	this.logger = logger;
    	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);
    	this.govNotify = new NotifyClient(this.environmentVariables.govukNotifyApiUrl(), govnotifyServiceId, GOVUKNOTIFY_API_KEY);
		this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInDays(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
    	this.govNotifyErrorMapper = new GovNotifyErrorMapper();
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
	}

	static getInstance(logger: Logger, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string): SendEmailService {
    	if (!this.instance) {
    		this.instance = new SendEmailService(logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId);
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
		// Fetch the instructions pdf from Yoti
		try {
			const encoded = await this.fetchInstructionsPdf(message);
			if (encoded) {
				this.logger.debug("sendEmail", SendEmailService.name);
				this.logger.info("Sending Yoti PDF email");

				const { GOV_NOTIFY_OPTIONS } = Constants;

				const options = {
					personalisation: {
						[GOV_NOTIFY_OPTIONS.FIRST_NAME]: message.firstName,
						[GOV_NOTIFY_OPTIONS.LAST_NAME]: message.lastName,
						[GOV_NOTIFY_OPTIONS.LINK_TO_FILE]: { "file": encoded, "confirm_email_before_download": true, "retention_period": "2 weeks" },
					},
					reference: message.referenceId,
				};

				const emailResponse = await this.sendGovNotification(this.environmentVariables.getPdfEmailTemplateId(this.logger), message, options);
				await this.sendF2FYotiEmailedEvent(message);
				return emailResponse;
			} else {
				this.logger.error("Failed to fetch the Instructions pdf", { messageCode: MessageCodes.FAILED_FETHCING_YOTI_PDF });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendYotiPdfEmail - Failed to fetch the Instructions pdf");
			}
		} catch (err: any) {
			this.logger.error("sendYotiPdfEmail - Cannot send Email", { messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendYotiPdfEmail - Cannot send Email");
		}
	}

	async sendReminderEmail(message: ReminderEmail): Promise<EmailResponse> {
		this.logger.info("Sending reminder email");

		try {
			const options = {
				reference: message.referenceId,
			};
		
			const emailResponse = await this.sendGovNotification(this.environmentVariables.getReminderEmailTemplateId(this.logger), message, options);
			return emailResponse;
		} catch (err: any) {
			this.logger.error("Failed to send Reminder Email", { messageCode: MessageCodes.FAILED_TO_SEND_REMINDER_EMAIL });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendReminderEmail - Failed sending Reminder Email");
		}
	}

	async sendDynamicReminderEmail(message: DynamicReminderEmail): Promise<EmailResponse> {
		this.logger.info("Sending dynamic reminder email");

		const { GOV_NOTIFY_OPTIONS } = Constants;

		try {
			const options = {
				personalisation: {
					[GOV_NOTIFY_OPTIONS.FIRST_NAME]: message.firstName,
					[GOV_NOTIFY_OPTIONS.LAST_NAME]: message.lastName,
					[GOV_NOTIFY_OPTIONS.CHOSEN_PHOTO_ID]: message.documentUsed,
				},
				reference: message.referenceId,
			};

			const emailResponse = await this.sendGovNotification(this.environmentVariables.getDynamicReminderEmailTemplateId(this.logger), message, options);
			return emailResponse;
		} catch (err: any) {
			this.logger.error("Failed to send Dynamic Reminder Email", { messageCode: MessageCodes.FAILED_TO_SEND_REMINDER_EMAIL });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendReminderEmail - Failed sending Dynamic Reminder Email");
		}
	}

	async sendF2FYotiEmailedEvent(message: Email): Promise<void> {
		const session = await this.f2fService.getSessionById(message.sessionId);
		if (session != null) {
			const coreEventFields = buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress);
			try {
				await this.f2fService.sendToTXMA({
					event_name: "F2F_YOTI_PDF_EMAILED",
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
			} catch (error) {
				this.logger.error("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
			}
		} else {
			this.logger.error("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ", message.sessionId);
		}
	}

	async sendGovNotification(templateId: string, message: Email | ReminderEmail, options: any): Promise<EmailResponse> {
		let retryCount = 0;
		//retry for maxRetry count configured value if fails
		while (retryCount <= this.environmentVariables.maxRetries()) {
			this.logger.debug("sendEmail - trying to send email message", {
				templateId: this.environmentVariables.getPdfEmailTemplateId(this.logger),
				referenceId: message.referenceId,
				retryCount,
			});

			try {
				const emailResponse = await this.govNotify.sendEmail(templateId, message.emailAddress, options);
				this.logger.debug("sendEmail - response status after sending Email", SendEmailService.name, emailResponse.status);
				return new EmailResponse(new Date().toISOString(), "", emailResponse.status);
			} catch (err: any) {
				this.logger.error("sendEmail - GOV UK Notify threw an error");

				if (err.response) {
					this.logger.error(`GOV UK Notify error ${SendEmailService.name}`, {
						statusCode: err.response.data.status_code,
						errors: err.response.data.errors,
					});
				}

				const appError: any = this.govNotifyErrorMapper.map(err.response.data.status_code, err.response.data.errors[0].message);

				if (appError.obj!.shouldRetry && retryCount < this.environmentVariables.maxRetries()) {
					this.logger.error(`sendEmail - Mapped error ${SendEmailService.name}`, { appError });
					this.logger.error(`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${SendEmailService.name} ${new Date().toISOString()}`, { retryCount });
					await sleep(this.environmentVariables.backoffPeriod());
					retryCount++;
				} else {
					throw appError;
				}
			}
		}
		this.logger.error(`sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`);
		throw new AppError(HttpCodesEnum.SERVER_ERROR, `sendEmail - Cannot send Email after ${this.environmentVariables.maxRetries()} retries`);
	}


	async fetchInstructionsPdf(message: Email): Promise<string> {
		let yotiInstructionsPdfRetryCount = 0;
		//retry for maxRetry count configured value if fails
		while (yotiInstructionsPdfRetryCount <= this.environmentVariables.yotiInstructionsPdfMaxRetries()) {
			this.logger.debug("Fetching the Instructions Pdf from yoti for sessionId: ", message.yotiSessionId);
			try {
				const instructionsPdf = await this.yotiService.fetchInstructionsPdf(message.yotiSessionId);
				if (instructionsPdf) {
					const encoded = Buffer.from(instructionsPdf, "binary").toString("base64");
					return encoded;
				}
			} catch (err: any) {
				this.logger.error("Error while fetching Instructions pfd or encoding the pdf.", { err });
				if ((err.statusCode === 500 || err.statusCode === 429) && yotiInstructionsPdfRetryCount < this.environmentVariables.yotiInstructionsPdfMaxRetries()) {
					this.logger.error(`sendEmail - Retrying to fetch the Instructions Pdf from yoti for sessionId : ${message.yotiSessionId}. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${SendEmailService.name} ${new Date().toISOString()}`, { yotiInstructionsPdfRetryCount });
					await sleep(this.environmentVariables.yotiInstructionsPdfBackoffPeriod());
					yotiInstructionsPdfRetryCount++;
				} else {
					throw err;
				}
			}
		}
		this.logger.error(`sendEmail - Could not fetch Instructions pdf after ${this.environmentVariables.yotiInstructionsPdfMaxRetries()} retries`);
		throw new AppError(HttpCodesEnum.SERVER_ERROR, `sendEmail - Could not fetch Instructions pdf after ${this.environmentVariables.yotiInstructionsPdfMaxRetries()} retries`);
	}
}
