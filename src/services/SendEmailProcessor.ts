import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { SendEmailService } from "./SendEmailService";
import { Constants } from "../utils/Constants";
import { Email } from "../models/Email";
import { DynamicReminderEmail } from "../models/DynamicReminderEmail";
import { ReminderEmail } from "../models/ReminderEmail";
import { EmailResponse } from "../models/EmailResponse";
import { ValidationHelper } from "../utils/ValidationHelper";

export class SendEmailProcessor {
  private static instance: SendEmailProcessor;

  private readonly validationHelper: ValidationHelper;

  private readonly govNotifyService: SendEmailService;

  private readonly metrics: Metrics; 

  private readonly logger: Logger; 


  constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string) {
  	this.validationHelper = new ValidationHelper();
	this.metrics = metrics;
	this.logger = logger;
  	this.govNotifyService = SendEmailService.getInstance(logger, this.metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId);
  }

  static getInstance(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string, GOVUKNOTIFY_API_KEY: string, govnotifyServiceId: string): SendEmailProcessor {
  	return this.instance || (this.instance = new SendEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId));
  }

  async processRequest(eventBody: any): Promise<EmailResponse | undefined> {
  	const messageType = eventBody.Message.messageType;
  	let email: Email;
  	let dynamicReminderEmail: DynamicReminderEmail;
  	let reminderEmail: ReminderEmail;
	
	const singleMetric = this.metrics.singleMetric();
  	switch (messageType) {
  		case Constants.PDF_EMAIL: {
  			email = Email.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(email, this.logger);
  			const pdfEmailResponse = this.govNotifyService.sendYotiPdfEmail(email);

			singleMetric.addDimension("emailType", "Pdf");
  			singleMetric.addMetric("GovNotify_email_sent", MetricUnits.Count, 1);
			this.metrics.addMetric("GovNotify_PDF_email_sent", MetricUnits.Count, 1);
			return pdfEmailResponse;
		}
  		case Constants.REMINDER_EMAIL_DYNAMIC: {
  			dynamicReminderEmail = DynamicReminderEmail.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(dynamicReminderEmail, this.logger);
  			const dynamicReminderEmailResponse = this.govNotifyService.sendDynamicReminderEmail(dynamicReminderEmail);

			singleMetric.addDimension("emailType", "dynamic_reminder");
  			singleMetric.addMetric("GovNotify_email_sent", MetricUnits.Count, 1);
			return dynamicReminderEmailResponse;
		}
  		case Constants.REMINDER_EMAIL: {
  			reminderEmail = ReminderEmail.parseRequest(JSON.stringify(eventBody.Message), this.logger);
  			await this.validationHelper.validateModel(reminderEmail, this.logger);
  			const reminderEmailResponse = this.govNotifyService.sendReminderEmail(reminderEmail);

			singleMetric.addDimension("emailType", "reminder");
  			singleMetric.addMetric("GovNotify_email_sent", MetricUnits.Count, 1);
			return reminderEmailResponse;
		}
  	}
  	return undefined;
  }
}
