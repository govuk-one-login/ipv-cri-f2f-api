import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { MessageCodes } from "./models/enums/MessageCodes";
import { FirstBranchVisitProcessor } from "./services/FirstBranchVisitProcessor";
import { YotiCallbackPayload } from "./type/YotiCallbackPayload";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { Constants } from "./utils/Constants";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = "FirstBranchVisitHandler",
} = process.env;

export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({
	namespace: POWERTOOLS_METRICS_NAMESPACE,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

class FirstBranchVisitHandler implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: YotiCallbackPayload, context: any): Promise<void | AppError> {
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			logger.appendKeys({
				yotiSessionId: event.session_id,
			});

			await FirstBranchVisitProcessor.getInstance(logger, metrics).processRequest(event);
			logger.debug("Finished processing first_branch_visit event");
		} catch (error: any) {
			logger.error({
				message: "Failed to process first_branch_visit event",
				error,
				messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to process first_branch_visit event");
		}
	}
}

const handlerClass = new FirstBranchVisitHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);