 
 
import { logger } from "@govuk-one-login/cri-logger";
import { SendToGovNotifyService } from "./SendToGovNotifyService";
import { EmailResponse } from "../models/EmailResponse";
import { MessageCodes } from "../models/enums/MessageCodes";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { captureMetric } from "@govuk-one-login/cri-metrics";

export class SendToGovNotifyProcessor {
  private static instance: SendToGovNotifyProcessor;

  private readonly sendToGovNotifyService: SendToGovNotifyService;
  
  constructor(GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string) {
  	this.sendToGovNotifyService = SendToGovNotifyService.getInstance(GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId);
  }

  static getInstance(GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string): SendToGovNotifyProcessor {
  	return this.instance || (this.instance = new SendToGovNotifyProcessor(GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId));
  }

  async processRequest(sessionId: string): Promise<EmailResponse | undefined> {  	
  	try {
  		return await this.sendToGovNotifyService.sendYotiInstructions(sessionId);
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
  	} catch (err: any) {
  		logger.error("sendYotiInstructions - Cannot send Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
		
  		captureMetric("SendToGovNotify_failed_to_send_instructions");

  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiInstructions - Cannot send Email",
  		);
  	}
  }
}
