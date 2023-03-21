import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.DOCUMENT_SELECTION_LOGGER_SVC_NAME;
const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

export class DocumentSelection implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		switch (event.resource) {
			case ResourcesEnum.DOCUMENTSELECTION:
				if (event.httpMethod === "POST") {
					try {
						logger.info("Got token request:", { event });
						logger.info("Logic TODO:");
					} catch (err) {
						logger.error({ message: "An error has occurred. ", err });
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				return new Response(HttpCodesEnum.NOT_FOUND, "");

			default:
				throw new AppError("Requested resource does not exist" + { resource: event.resource }, HttpCodesEnum.NOT_FOUND);

		}
	}
}
const handlerClass = new DocumentSelection();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
