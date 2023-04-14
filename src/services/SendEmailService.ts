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
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { F2fService } from "./F2fService";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";

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
	private constructor(logger: Logger, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string) {
    	this.logger = logger;
    	this.environmentVariables = new EnvironmentVariables(logger);
    	this.govNotify = new NotifyClient(GOVUKNOTIFY_API_KEY);
		this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), YOTI_PRIVATE_KEY);
    	this.govNotifyErrorMapper = new GovNotifyErrorMapper();
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
	}

	static getInstance(logger: Logger, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string): SendEmailService {
    	if (!this.instance) {
    		this.instance = new SendEmailService(logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY);
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
	async sendEmail(message: Email): Promise<EmailResponse> {
    	let encoded;
    	// Fetch the instructions pdf from Yoti
    	this.logger.debug("Fetching the Instructions Pdf from yoti for sessionId: ", message.yotiSessionId);
    	try {
    		const instructionsPdf = await this.yotiService.fetchInstructionsPdf(message.yotiSessionId);
			if (instructionsPdf) {
				encoded = Buffer.from(instructionsPdf, "binary").toString("base64");
			}
    	} catch (err) {
    		this.logger.error("Error while fetching Instructions pfd or encoding the pdf." + err);
    		throw err;
    	}

    	const personalisation = {
    		"first name": message.firstName,
    		"last name": message.lastName,
    		"link_to_file": { "file": encoded, "confirm_email_before_download": true, "retention_period": "2 weeks" },
    	};


    	const options = {
    		personalisation,
    		reference: message.referenceId,
    	};

    	this.logger.debug("sendEmail", SendEmailService.name);

    	let retryCount = 0;
    	//retry for maxRetry count configured value if fails
    	while (retryCount++ < this.environmentVariables.maxRetries() + 1) {
    		this.logger.debug(`sendEmail - trying to send email message ${SendEmailService.name} ${new Date().toISOString()}`, {
    			templateId: this.environmentVariables.getEmailTemplateId(this.logger),
    			emailAddress: message.emailAddress,
    			options,
    		});

    		try {
    			const emailResponse = await this.govNotify.sendEmail(this.environmentVariables.getEmailTemplateId(this.logger), message.emailAddress, options);
    			this.logger.debug("sendEmail - response data after sending Email", emailResponse.data);
    			this.logger.debug("sendEmail - response status after sending Email", SendEmailService.name, emailResponse.status);
				const session = await this.f2fService.getSessionById(message.sessionId);
				if (session != null) {
					try {
						await this.f2fService.sendToTXMA({
							event_name: "F2F_YOTI_PDF_EMAILED",
							...buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress, absoluteTimeNow),
						});
					} catch (error) {
						this.logger.error("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
					}
				} else {
					this.logger.error("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ", message.sessionId);
				}
    			return new EmailResponse(new Date().toISOString(), "", emailResponse.status);
    		} catch (err: any) {
    			this.logger.error("sendEmail - GOV UK Notify threw an error");

    			if (err.response) {
    				// err.response.data.status_code 	err.response.data.errors
    				this.logger.error(`GOV UK Notify error ${SendEmailService.name}`, {
    					statusCode: err.response.data.status_code,
    					errors: err.response.data.errors,
    				});
    			}

    			const appError: any = this.govNotifyErrorMapper.map(err);

    			if (appError.obj!.shouldThrow) {
    				this.logger.error("sendEmail - Mapped error", SendEmailService.name, appError.message);
    				throw appError;
    			} else {
    				this.logger.error(`sendEmail - Mapped error ${SendEmailService.name}`, { appError });
    				this.logger.error(`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${SendEmailService.name} ${new Date().toISOString()}`, { retryCount });
    				await sleep(this.environmentVariables.backoffPeriod());
    			}
    		}
    	}

    	// If the email couldn't be sent after the retries,
    	// an error is thrown
    	this.logger.error(`sendEmail - cannot send EMail ${SendEmailService.name}`);
    	throw new AppError(HttpCodesEnum.SERVER_ERROR, "Cannot send EMail");
	}

}
