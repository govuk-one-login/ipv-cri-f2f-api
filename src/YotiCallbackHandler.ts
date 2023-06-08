import { SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";
import { getParameter } from "./utils/Config";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { YotiCallbackProcessor } from "./services/YotiCallbackProcessor";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { failEntireBatch, passEntireBatch } from "./utils/SqsBatchResponseHelper";

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
	async handler(event: SQSEvent, context: any): Promise<any> {
		if (event.Records.length === 1) {
			const record: SQSRecord = event.Records[0];
			logger.debug("Starting to process record", { record });
			const batchFailures: BatchItemFailure[] = [];

			try {
				const body = JSON.parse(record.body);
				logger.debug("Parsed SQS event body", body);
				if (!YOTI_PRIVATE_KEY) {
					logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
					try {
						YOTI_PRIVATE_KEY = await getParameter(this.environmentVariables.yotiKeySsmPath());
					} catch (err) {
						logger.error(`failed to get param from ssm at ${this.environmentVariables.yotiKeySsmPath()}`, { err });
						throw err;
					}
				}
				
				if (body.topic === "session_completion") {
					await YotiCallbackProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(body);
				} else {
					logger.warn("Unexpected topic received in request");
					return failEntireBatch;
				}
				

				logger.debug("Finished processing record from SQS");
				return passEntireBatch;

			} catch (error: any) {
				if (error.obj?.shouldThrow) {
					logger.error("Error encountered", { error });
					error.obj = undefined;
					batchFailures.push(new BatchItemFailure(record.messageId));
					const sqsBatchResponse = { batchItemFailures: batchFailures };
					logger.error("Returning batch item failure so it can be retried", { sqsBatchResponse });
					return sqsBatchResponse;
				} else {
					logger.error({ message: "VC could not be sent. Returning failed message ", error });
					return failEntireBatch;
				}
			}

		} else {
			logger.warn("Unexpected no of records received");
			return failEntireBatch;
		}
	}

}

const handlerClass = new YotiCallbackHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
