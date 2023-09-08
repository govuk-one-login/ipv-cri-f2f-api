import { SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";
import { MessageCodes } from "./models/enums/MessageCodes";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.YOTI_CALLBACK_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

// const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class TriggerYotiCallbackStateMachineHandler implements LambdaInterface {
	// @metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	handler(event: SQSEvent, context: any): void {
    logger.info("hi");

	}
}

const handlerClass = new TriggerYotiCallbackStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
