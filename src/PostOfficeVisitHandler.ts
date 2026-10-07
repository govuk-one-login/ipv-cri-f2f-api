import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { YotiCallbackTopics } from "./models/enums/YotiCallbackTopics";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { PostOfficeVisitProcessor } from "./services/PostOfficeVisitProcessor";
import { YotiCallbackPayload } from "./type/YotiCallbackPayload";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { YotiPrivateKeyProvider } from "./services/callback/YotiPrivateKeyProvider";

const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME;

class PostOfficeVisitHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(ServicesEnum.THANK_YOU_EMAIL_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: YotiCallbackPayload, context: any): Promise<void | AppError> {

		logger.resetKeys();
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			logger.appendKeys({	yotiSessionId: event.session_id });

			let yotiPrivateKey: string | undefined;
			if (event.topic === YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED) {
				yotiPrivateKey = await YotiPrivateKeyProvider.getYotiPrivateKey(this.environmentVariables);
			}

			await PostOfficeVisitProcessor.getInstance(yotiPrivateKey).processRequest(event);
			logger.info("Finished processing record from SQS");

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
