/* eslint-disable max-len */
/* eslint-disable max-params */
import { Logger } from "@aws-lambda-powertools/logger";
import { SendToGovNotifyService } from "./SendToGovNotifyService";
import { EmailResponse } from "../models/EmailResponse";
import { MessageCodes } from "../models/enums/MessageCodes";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { AppError } from "../utils/AppError";

export class SendToGovNotifyProcessor {
  private static instance: SendToGovNotifyProcessor;

  private readonly sendToGovNotifyService: SendToGovNotifyService;

  constructor(private readonly logger: Logger, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string) {
  	this.sendToGovNotifyService = SendToGovNotifyService.getInstance(this.logger, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId);
  }

  static getInstance(logger: Logger, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string): SendToGovNotifyProcessor {
  	return this.instance || (this.instance = new SendToGovNotifyProcessor(logger, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId));
  }

  async processRequest(sessionId: string): Promise<EmailResponse | undefined> {  	
  	try {
  		return await this.sendToGovNotifyService.sendYotiInstructions(sessionId);
  	} catch (err: any) {
  		this.logger.error("sendYotiInstructions - Cannot send Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiInstructions - Cannot send Email",
  		);
  	}
  }
}
