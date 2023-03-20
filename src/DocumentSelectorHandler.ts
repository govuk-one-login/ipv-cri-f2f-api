import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { DocumentSelectorProcessor } from "./services/DocumentSelectorProcessor";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : "CIC-CRI";
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: "DocumentSelectorHandler",
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: "DocumentSelectorHandler" });

class Session implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
			try {
				logger.debug("metrics is", { metrics });
				logger.debug("Event received", { event });
				return await DocumentSelectorProcessor.getInstance(logger, metrics).processRequest(event);
			} catch (err: any) {
				logger.error("An error has occurred. " + err);
				if (err instanceof AppError) {
					return new Response(err.statusCode, err.message);
				}
				return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
			}
		}
	}

const handlerClass = new Session();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
