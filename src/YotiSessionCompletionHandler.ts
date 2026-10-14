import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { YotiSessionCompletionProcessor } from "./services/YotiSessionCompletionProcessor";
import { YotiCallbackPayload } from "./type/YotiCallbackPayload";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { YotiPrivateKeyProvider } from "./services/callback/YotiPrivateKeyProvider";


class YotiSessionCompletionHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(ServicesEnum.CALLBACK_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: YotiCallbackPayload, context: any): Promise<void | AppError> {

		logger.resetKeys();
		logger.addContext(context);

		try {
			logger.appendKeys({	yotiSessionId: event.session_id });
			const yotiPrivateKey = await YotiPrivateKeyProvider.getYotiPrivateKey(this.environmentVariables);
			await YotiSessionCompletionProcessor.getInstance(yotiPrivateKey).processRequest(event);
			logger.info("Finished processing record from SQS");

		} catch (error: any) {
			logger.error({ message: "Failed to process session_completion event",
				error,
				messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to process session_completion event");
		}
	}
}

const handlerClass = new YotiSessionCompletionHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
