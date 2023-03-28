import { Email } from "../models/Email";
import { EmailResponse } from "../models/EmailResponse";
import { ValidationHelper } from "../utils/ValidationHelper";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { GovNotifyService } from "./GovNotifyService";

export class SendEmailProcessor {

    private static instance: SendEmailProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    private readonly validationHelper: ValidationHelper;

    constructor(logger: Logger, metrics: Metrics) {

    	this.logger = logger;
    	this.validationHelper = new ValidationHelper();
    	this.metrics = metrics;
    }

    static getInstance(logger: Logger, metrics: Metrics): SendEmailProcessor {
    	if (!SendEmailProcessor.instance) {
    		SendEmailProcessor.instance = new SendEmailProcessor(logger, metrics);
    	}
    	return SendEmailProcessor.instance;
    }

    async processRequest(eventBody: any): Promise<EmailResponse> {

    	const email = Email.parseRequest(eventBody.Message);
    	console.log("Email parsed", "Handler", email);

    	await this.validationHelper.validateModel(email, this.logger);
    	const govNotifyService = GovNotifyService.getInstance(this.logger);


    	const emailResponse: EmailResponse = await govNotifyService.sendEmail(email);
    	this.logger.debug("Response after sending Email message", { emailResponse });

    	return emailResponse;
    }
}

