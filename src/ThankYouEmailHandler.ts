import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { ThankYouEmailProcessor } from "./services/ThankYouEmailProcessor";
import { YotiCallbackPayload } from "./type/YotiCallbackPayload";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { Constants } from "./utils/Constants";
import { getParameter } from "./utils/Config";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = Constants.YOTI_CALLBACK_SVC_NAME,
} = process.env;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

let YOTI_PRIVATE_KEY: string;

class ThankYouEmailHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.THANK_YOU_EMAIL_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: YotiCallbackPayload, context: any): Promise<void | AppError> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		try {
			logger.appendKeys({	yotiSessionId: event.session_id });

			if (!YOTI_PRIVATE_KEY) {
				logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
				try {
					YOTI_PRIVATE_KEY = await getParameter(this.environmentVariables.yotiKeySsmPath());
				} catch (error) {
					logger.error(`failed to get param from ssm at ${this.environmentVariables.yotiKeySsmPath()}`, {
						messageCode: MessageCodes.MISSING_CONFIGURATION,
						error,
					});
					return new AppError(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
				}
			}

			await ThankYouEmailProcessor.getInstance(logger, metrics).processRequest(event, YOTI_PRIVATE_KEY);
			logger.debug("Finished processing record from SQS");

		} catch (error: any) {
			logger.error({ message: "Failed to process thank_you_email_requested event",
				error,
				messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to process thank_you_email_requested event");
		}
	}
}

const handlerClass = new ThankYouEmailHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
