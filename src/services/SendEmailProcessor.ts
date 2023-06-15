import { Email } from "../models/Email";
import { EmailResponse } from "../models/EmailResponse";
import { ValidationHelper } from "../utils/ValidationHelper";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { SendEmailService } from "./SendEmailService";

export class SendEmailProcessor {

    private static instance: SendEmailProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    private readonly validationHelper: ValidationHelper;

	private readonly govNotifyService: SendEmailService;

	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string) {

    	this.logger = logger;
    	this.validationHelper = new ValidationHelper();
    	this.metrics = metrics;
		this.govNotifyService = SendEmailService.getInstance(this.logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY);
	}

	static getInstance(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string): SendEmailProcessor {
    	if (!SendEmailProcessor.instance) {
    		SendEmailProcessor.instance = new SendEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY);
    	}
    	return SendEmailProcessor.instance;
	}

	async processRequest(eventBody: any): Promise<EmailResponse> {

		const email = Email.parseRequest(JSON.stringify(eventBody.Message));

    	await this.validationHelper.validateModel(email, this.logger);

    	const emailResponse = await this.govNotifyService.sendEmail(email);
    	this.logger.debug("Response after sending Email message", { emailResponse });

    	return emailResponse;
	}
}

