import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { SendEmailService } from "./SendEmailService";
import { Constants } from "../utils/Constants";
import { Email } from "../models/Email";
import { ReminderEmail } from "../models/ReminderEmail";
import { EmailResponse } from "../models/EmailResponse";
import { ValidationHelper } from "../utils/ValidationHelper";

export class SendEmailProcessor {
  private static instance: SendEmailProcessor;

  private readonly validationHelper: ValidationHelper;

  private readonly govNotifyService: SendEmailService;

  constructor(private readonly logger: Logger, private readonly metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string) {
  	this.validationHelper = new ValidationHelper();
  	this.govNotifyService = SendEmailService.getInstance(this.logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId);
  }

  static getInstance(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string): SendEmailProcessor {
  	return this.instance || (this.instance = new SendEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId));
  }

  async processRequest(eventBody: any): Promise<EmailResponse | undefined> {
  	const messageType = eventBody.Message.messageType;

  	switch (messageType) {
  		case Constants.REMINDER_EMAIL:
  			const reminderEmail = ReminderEmail.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(reminderEmail, this.logger);
  			return this.govNotifyService.sendReminderEmail(reminderEmail);

  		case Constants.PDF_EMAIL:
  			const email = Email.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(email, this.logger);
  			return this.govNotifyService.sendYotiPdfEmail(email);
  	}

  	return undefined;
  }
}
