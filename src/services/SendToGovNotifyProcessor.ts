import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { SendToGovNotifyService } from "./SendToGovNotifyService";
import { PdfPreferenceEmail } from "../models/PdfPreferenceEmail";
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

  async processRequest(event: any): Promise<EmailResponse | undefined> {  	
  	let pdfPreferenceEmail: PdfPreferenceEmail;

  	pdfPreferenceEmail = PdfPreferenceEmail.parseRequest(JSON.stringify(event), this.logger);
  	await this.validationHelper.validateModel(pdfPreferenceEmail, this.logger);
  	return this.sendToGovNotifyService.sendYotiInstructions(pdfPreferenceEmail);
  }
}
