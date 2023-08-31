import { Response } from "../utils/Response";
import { POST_OFFICE_RESPONSE } from "../data/postOfficeResponse/postOfficeSuccessResponse";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";

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

    // POST /postofficeapi/locations/search
    async mockSearchLocations(searchString: any): Promise<any> {
		this.logger.info({ message: "Successful resquest" });
		return new Response(HttpCodesEnum.OK, JSON.stringify(POST_OFFICE_RESPONSE));
    }
}
