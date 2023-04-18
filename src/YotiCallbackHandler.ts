import { SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";

import { LambdaInterface } from "@aws-lambda-powertools/commons";

import { Constants } from "./utils/Constants";

import { BatchItemFailure } from "./utils/BatchItemFailure";
import { HttpCodesEnum } from "./models/enums/HttpCodesEnum";
import { getParameter } from "./utils/Config";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { YotiCallbackProcessor } from "./services/YotiCallbackProcessor";
import { ServicesEnum } from "./models/enums/ServicesEnum";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.EMAIL_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.EMAIL_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

let YOTI_PRIVATE_KEY: string;

class GovNotifyHandler implements LambdaInterface {
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
				
				await YotiCallbackProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(body);

				logger.debug("Finished processing record from SQS");
				return new Response(HttpCodesEnum.OK, "OK");

			} catch (error: any) {
				const appErrorCode = error.appCode;
				const statusCode = error.statusCode ? error.statusCode : HttpCodesEnum.SERVER_ERROR;
				const body = {
					statusCode,
					message: error.message || JSON.stringify(error),
					batchItemFailures: [],
					error,
					appErrorCode,
				};

				logger.error("VC could not be sent. Returning failed message", error);
				return new Response(statusCode, body, appErrorCode);
			}

		} else {
			logger.warn("Unexpected no of records received");
			return new Response(HttpCodesEnum.BAD_REQUEST, "Unexpected no of records received");
		}
	}

}

const handlerClass = new GovNotifyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
