import { Response } from "../utils/Response";
import { POST_SEND_LETTER_400 } from "../data/postSendLetter/postSendLetter400";
import { POST_SEND_LETTER_403 } from "../data/postSendLetter/postSendLetter403";
import { POST_SEND_LETTER_429 } from "../data/postSendLetter/postSendLetter429";
import { POST_SEND_LETTER_500 } from "../data/postSendLetter/postSendLetter500";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";

export class GovNotifyRequestLetterProcessor {
    private static instance: GovNotifyRequestLetterProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    constructor(logger: Logger, metrics: Metrics) {
    	this.logger = logger;

    	this.metrics = metrics;
    }

    static getInstance(logger: Logger, metrics: Metrics): GovNotifyRequestLetterProcessor {
    	if (!GovNotifyRequestLetterProcessor.instance) {
    		GovNotifyRequestLetterProcessor.instance = new GovNotifyRequestLetterProcessor(logger, metrics);
    	}
    	return GovNotifyRequestLetterProcessor.instance;
    }
    
	/***
     * POST /govnotify/v2/notifications/letter
     * @param referenceId
     */
	async mockSendLetter(referenceId: any): Promise<any> {
    	const lastCodeChars = referenceId.slice(-3);
    	this.logger.info({ message: "last 3 chars", lastCodeChars });

    	switch (lastCodeChars) {
    		case "400":
    			this.logger.info({ message: "Returning 400 response back" });
    			return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SEND_LETTER_400));
    		case "403":
    			this.logger.info({ message: "Returning 403 response back" });
    			return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(POST_SEND_LETTER_403));
    		case "429":
    			this.logger.info({ message: "Returning 429 response back" });
    			return new Response(HttpCodesEnum.TOO_MANY_REQUESTS, JSON.stringify(POST_SEND_LETTER_429));
    		case "500":
    			this.logger.info({ message: "Returning 500 response back" });
    			return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(POST_SEND_LETTER_500));
    		case "999":
    			// This will result in 504 timeout currently as sleep interval is 30s
    			this.logger.info({ message: "Timeout" });
    			await new Promise(resolve => setTimeout(resolve, 30000));
    			break;
    		default:
    			return new Response(HttpCodesEnum.CREATED, "Successfully sent letter.");
    	}
    }
}
