import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { YotiCallbackTopics } from "./models/enums/YotiCallbackTopics";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { PostOfficeVisitProcessor } from "./services/PostOfficeVisitProcessor";
import { YotiCallbackPayload } from "./type/YotiCallbackPayload";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { Constants } from "./utils/Constants";
import { YotiPrivateKeyProvider } from "./services/callback/YotiPrivateKeyProvider";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = "PostOfficeVisitHandler",
} = process.env;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class PostOfficeVisitHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.THANK_YOU_EMAIL_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: YotiCallbackPayload, context: any): Promise<void | AppError> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			logger.appendKeys({	yotiSessionId: event.session_id });

			let yotiPrivateKey: string | undefined;
			if (event.topic === YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED) {
				yotiPrivateKey = await YotiPrivateKeyProvider.getYotiPrivateKey(logger, this.environmentVariables);
			}

			await PostOfficeVisitProcessor.getInstance(logger, metrics, yotiPrivateKey).processRequest(event);
			logger.debug("Finished processing record from SQS");

		} catch (error: any) {
			logger.error({ message: "Failed to process post office visit callback event",
				error,
				messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to process post office visit callback event");
		}
	}
}

const handlerClass = new PostOfficeVisitHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
