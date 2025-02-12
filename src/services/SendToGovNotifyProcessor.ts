/* eslint-disable max-len */
/* eslint-disable max-params */
import { Logger } from "@aws-lambda-powertools/logger";
import { SendToGovNotifyService } from "./SendToGovNotifyService";
import { EmailResponse } from "../models/EmailResponse";
import { MessageCodes } from "../models/enums/MessageCodes";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";

export class SendToGovNotifyProcessor {
  private static instance: SendToGovNotifyProcessor;

  private readonly sendToGovNotifyService: SendToGovNotifyService;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  constructor(logger: Logger, metrics: Metrics, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string) {
  	this.metrics = metrics;
  	this.logger = logger;
  	this.sendToGovNotifyService = SendToGovNotifyService.getInstance(this.logger, this.metrics, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId);
  }

  static getInstance(logger: Logger, metrics: Metrics, GOVUKNOTIFY_API_KEY: string, sendToGovNotifyServiceId: string): SendToGovNotifyProcessor {
  	return this.instance || (this.instance = new SendToGovNotifyProcessor(logger, metrics, GOVUKNOTIFY_API_KEY, sendToGovNotifyServiceId));
  }

  async processRequest(sessionId: string): Promise<EmailResponse | undefined> {  	
  	try {
  		return await this.sendToGovNotifyService.sendYotiInstructions(sessionId);
  	} catch (err: any) {
  		this.logger.error("sendYotiInstructions - Cannot send Email", {
  			messageCode: MessageCodes.FAILED_TO_SEND_PDF_EMAIL,
  		});
		
  		this.metrics.addMetric("SendToGovNotify_failed_to_send_instructions", MetricUnits.Count, 1);

  		throw new AppError(
  			HttpCodesEnum.SERVER_ERROR,
  			"sendYotiInstructions - Cannot send Email",
  		);
  	}
  }
}
