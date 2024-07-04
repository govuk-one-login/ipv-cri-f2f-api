import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = "TODO",
} = process.env;


const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class SendToGovNotifyHandler implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	handler(event: any, context: any): any {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		return {
			statusCode: 200,
			body: "OK",
		};
	}
}

const handlerClass = new SendToGovNotifyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
