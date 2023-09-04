import { Response } from "../utils/Response";
import { POST_SEND_EMAIL_400 } from "../data/postSendEmail/postSendEmail400";
import { POST_SEND_EMAIL_403 } from "../data/postSendEmail/postSendEmail403";
import { POST_SEND_EMAIL_429 } from "../data/postSendEmail/postSendEmail429";
import { POST_SEND_EMAIL_500 } from "../data/postSendEmail/postSendEmail500";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";

export class GovNotifyRequestProcessor {
    private static instance: GovNotifyRequestProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    constructor(logger: Logger, metrics: Metrics) {
    	this.logger = logger;

    	this.metrics = metrics;
    }

    static getInstance(logger: Logger, metrics: Metrics): GovNotifyRequestProcessor {
    	if (!GovNotifyRequestProcessor.instance) {
    		GovNotifyRequestProcessor.instance = new GovNotifyRequestProcessor(logger, metrics);
    	}
    	return GovNotifyRequestProcessor.instance;
    }

    /***
     * POST /govnotify/v2/notifications/email
     * @param emailId
     */
    async mockSendEmail(emailId: any): Promise<any> {
    	const lastCodeChars = emailId.split("@")[0].slice(-3);
    	this.logger.info({ message: "last 3 digit chars", lastCodeChars });

    	switch (lastCodeChars) {
    		case "400":
    			this.logger.info({ message: "Returning 400 response back" });
    			return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SEND_EMAIL_400));
    		case "403":
    			this.logger.info({ message: "Returning 403 response back" });
    			return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(POST_SEND_EMAIL_403));
    		case "429":
    			this.logger.info({ message: "Returning 429 response back" });
    			return new Response(HttpCodesEnum.TOO_MANY_REQUESTS, JSON.stringify(POST_SEND_EMAIL_429));
    		case "500":
    			this.logger.info({ message: "Returning 500 response back" });
    			return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(POST_SEND_EMAIL_500));
    		case "999":
    			// This will result in 504 timeout currently as sleep interval is 30s
    			this.logger.info({ message: "Timeout" });
    			await new Promise(resolve => setTimeout(resolve, 30000));
    			break;
    		default:
    			return new Response(HttpCodesEnum.CREATED, "Successfully sent email.");
    	}
    }

}
