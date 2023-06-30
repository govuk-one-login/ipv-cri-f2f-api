import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AppError } from "./utils/AppError";
import { AccessTokenRequestProcessor } from "./services/AccessTokenRequestProcessor";
import { MessageCodes } from "./models/enums/MessageCodes";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.ACCESSTOKEN_LOGGER_SVC_NAME;
const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

export class AccessToken implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		switch (event.resource) {
			case ResourcesEnum.TOKEN:
				if (event.httpMethod === "POST") {
					try {
						logger.info("Received token request:", { requestId: event.requestContext.requestId });
						return await AccessTokenRequestProcessor.getInstance(logger, metrics).processRequest(event);
					} catch (err) {
						logger.error({ message: "An error has occurred. ", err });
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				logger.warn("Method not implemented", { messageCode: MessageCodes.METHOD_NOT_IMPLEMENTED });
				return new Response(HttpCodesEnum.NOT_FOUND, "");

			default:
				logger.error("Requested resource does not exist", {
					resource: event.resource,
					messageCode: MessageCodes.RESOURCE_NOT_FOUND,
				});
				throw new AppError(HttpCodesEnum.NOT_FOUND, "Requested resource does not exist" + { resource: event.resource });

		}
	}
}
const handlerClass = new AccessToken();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
