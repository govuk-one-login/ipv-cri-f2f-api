import { Response } from "../utils/Response";
import { POST_OFFICE_RESPONSE } from "../data/postOfficeResponse/postOfficeSuccessResponse";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { POST_REPONSE_400 } from "../data/postOfficeResponse/postResponse400";
import { POST_REPONSE_403 } from "../data/postOfficeResponse/postResponse403";
import { POST_REPONSE_429 } from "../data/postOfficeResponse/postResponse429";
import { POST_REPONSE_500 } from "../data/postOfficeResponse/postResponse500";
import { POST_REPONSE_503 } from "../data/postOfficeResponse/postResponse503";

export class PostOfficeRequestProcessor {
    private static instance: PostOfficeRequestProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    constructor(logger: Logger, metrics: Metrics) {
    	this.logger = logger;

    	this.metrics = metrics;
    }

    static getInstance(logger: Logger, metrics: Metrics): PostOfficeRequestProcessor {
    	if (!PostOfficeRequestProcessor.instance) {
    		PostOfficeRequestProcessor.instance = new PostOfficeRequestProcessor(logger, metrics);
    	}
    	return PostOfficeRequestProcessor.instance;
    }

    /***
     * POST /postofficeapi/locations/search
     * @param searchString
     */    
    async mockSearchLocations(searchString: any): Promise<any> {
    	const lastCodeChars = searchString.split("@")[0].slice(-3);
    	this.logger.info({ message: "last 3 digit chars", lastCodeChars });

    	switch (lastCodeChars) {
    		case "400":
    			this.logger.info({ message: "Returning 400 response back" });
    			return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_REPONSE_400));
    		case "403":
    			this.logger.info({ message: "Returning 403 response back" });
    			return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(POST_REPONSE_403));
    		case "429":
    			this.logger.info({ message: "Returning 429 response back" });
    			return new Response(HttpCodesEnum.TOO_MANY_REQUESTS, JSON.stringify(POST_REPONSE_429));
    		case "500":
    			this.logger.info({ message: "Returning 500 response back" });
    			return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(POST_REPONSE_500));
    		case "503":
    			this.logger.info({ message: "Returning 503 response back" });
    			return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(POST_REPONSE_503));
    		default:
    			this.logger.info({ message: "Successful request" });
    			return new Response(HttpCodesEnum.OK, JSON.stringify(POST_OFFICE_RESPONSE));
    	}
    }
}
