import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { SendToGovNotifyService } from "./SendToGovNotifyService";
import { Constants } from "../utils/Constants";
import { Email } from "../models/Email";
import { ReminderEmail } from "../models/ReminderEmail";
import { DynamicReminderEmail } from "../models/DynamicReminderEmail";
import { EmailResponse } from "../models/EmailResponse";
import { ValidationHelper } from "../utils/ValidationHelper";

export class SendToGovNotifyProcessor {
  private static instance: SendToGovNotifyProcessor;

  private readonly validationHelper: ValidationHelper;

  private readonly sendToGovNotifyService: SendToGovNotifyService;

  constructor(private readonly logger: Logger, private readonly metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string) {
  	this.validationHelper = new ValidationHelper();
  	this.sendToGovNotifyService = SendToGovNotifyService.getInstance(this.logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId);
  }

  static getInstance(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string): SendToGovNotifyProcessor {
  	return this.instance || (this.instance = new SendToGovNotifyProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId));
  }

  async processRequest(eventBody: any): Promise<EmailResponse | undefined> {
  	const messageType = eventBody.Message.messageType;
  	const yotiSessionId = eventBody.Message.yotiSessionId;
  	let dynamicReminderEmail: DynamicReminderEmail;
  	let reminderEmail: ReminderEmail;
  	let email: Email;

  	switch (messageType) {
  		case Constants.REMINDER_EMAIL_DYNAMIC:
  			dynamicReminderEmail = DynamicReminderEmail.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(dynamicReminderEmail, this.logger);
  			return this.sendToGovNotifyService.sendDynamicReminderEmail(dynamicReminderEmail);
				
  		case Constants.REMINDER_EMAIL:
  			reminderEmail = ReminderEmail.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(reminderEmail, this.logger);
  			return this.sendToGovNotifyService.sendReminderEmail(reminderEmail);

  		case Constants.PDF_EMAIL:
  			email = Email.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(email, this.logger);
  			return this.sendToGovNotifyService.sendYotiPdfEmail(email, yotiSessionId);

  		// case Constants.POSTED_CUSTOMER_LETTER:
  		// 	email = Email.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  		// 	await this.validationHelper.validateModel(email, this.logger);
  		// 	return this.sendToGovNotifyService.sendYotiPdfEmail(email, yotiSessionId);
  	}

  	return undefined;
  }
}
