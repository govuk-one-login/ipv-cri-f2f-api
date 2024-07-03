import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { ExpiredSessionsProcessor } from "./services/ExpiredSessionsProcessor";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { MessageCodes } from "./models/enums/MessageCodes";

const {
	POWERTOOLS_METRICS_NAMESPACE = "F2F-CRI",
	POWERTOOLS_LOG_LEVEL = "DEBUG",
	POWERTOOLS_SERVICE_NAME = Constants.EXPIRED_SESSIONS_LOGGER_SVC_NAME,
} = process.env;

const logger = new Logger({ logLevel: POWERTOOLS_LOG_LEVEL, serviceName: POWERTOOLS_SERVICE_NAME });
const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class Session implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<Response> {
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		try {
			logger.info("Starting ExpiredSessionsProcessor");
			return await ExpiredSessionsProcessor.getInstance(logger, metrics).processRequest();
		} catch (error: any) {
			const statusCode = error instanceof AppError ? error.statusCode : HttpCodesEnum.SERVER_ERROR;
			logger.error("An error has occurred.", { messageCode: MessageCodes.SERVER_ERROR });
			return new Response(statusCode, "Server Error");
		}
	}
}

const lambdaHandler = new Session().handler.bind(new Session());
export { lambdaHandler };
