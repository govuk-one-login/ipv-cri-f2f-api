import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";
import { getParameter } from "./utils/Config";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { CompletedSessionProcessor } from "./services/CompletedSessionProcessor";
import { ThankYouEmailProcessor } from "./services/ThankYouEmailProcessor";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { failEntireBatch, passEntireBatch } from "./utils/SqsBatchResponseHelper";
import { MessageCodes } from "./models/enums/MessageCodes";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.YOTI_CALLBACK_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

let YOTI_PRIVATE_KEY: string;

class YotiCallbackHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.CALLBACK_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	// TODO sort out the types as this is no longer an SQS event
	async handler(event: any, context: any): Promise<any> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		try {
			const body = JSON.parse(event.body);
			logger.appendKeys({
				yotiSessionId: body.session_id,
			});
			logger.debug("Parsed event body", body);

			if (!YOTI_PRIVATE_KEY) {
				logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
				try {
					YOTI_PRIVATE_KEY = await getParameter(this.environmentVariables.yotiKeySsmPath());
				} catch (error) {
					logger.error(`failed to get param from ssm at ${this.environmentVariables.yotiKeySsmPath()}`, {
						messageCode: MessageCodes.MISSING_CONFIGURATION,
						error,
					});
					return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
				}
			}

			await CompletedSessionProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(body);

			logger.debug("Finished processing record from SQS");
			return passEntireBatch;

		} catch (error: any) {
			if (error.obj?.shouldThrow) {
				logger.error("Error encountered", { error });
				error.obj = undefined;
				// batchFailures.push(new BatchItemFailure(record.messageId));
				const sqsBatchResponse = { batchItemFailures: "batchFailures" };
				logger.error("Returning batch item failure so it can be retried", {
					sqsBatchResponse,
					messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
				});
				return sqsBatchResponse;
			} else {
				logger.error({ message: "VC could not be sent. Returning failed message ",
					error,
					messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
				});
				return failEntireBatch;
			}
		}
	}

}

const handlerClass = new YotiCallbackHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
