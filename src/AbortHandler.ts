import { APIGatewayProxyEvent } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { Constants } from "./utils/Constants";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { Response, unauthorizedResponse } from "./utils/Response";
import { AppError } from "./utils/AppError";
import { AbortRequestProcessor } from "./services/AbortRequestProcessor";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.DOCUMENT_SELECTION_LOGGER_SVC_NAME;
const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

export class AbortHandler implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })

	async handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);
		switch (event.resource) {
			case ResourcesEnum.ABORT:
				if (event.httpMethod === "POST") {
					try {
						let sessionId;
						if (event.headers) {
							sessionId = event.headers[Constants.X_SESSION_ID];
							logger.appendKeys({ sessionId });
							if (sessionId) {
								if (!Constants.REGEX_UUID.test(sessionId)) {
									logger.error("Session id must be a valid uuid",
										{
											messageCode: MessageCodes.INVALID_SESSION_ID,
										});
									return unauthorizedResponse;
								}
							} else {
								logger.error("Missing header: session-id is required",
									{
										messageCode: MessageCodes.MISSING_SESSION_ID,
									});
								return unauthorizedResponse;
							}
						} else {
							logger.error("Empty headers",
								{
									messageCode: MessageCodes.EMPTY_HEADERS,
								});
							return unauthorizedResponse;
						}

						logger.info("Starting AbortRequestProcessor",
							{
								resource: event.resource,
							});
						return await AbortRequestProcessor.getInstance(logger, metrics).processRequest(sessionId);
					} catch (error) {
						logger.error({ message: "An error has occurred. ",
							error,
							messageCode: MessageCodes.SERVER_ERROR,
						});
						if (error instanceof AppError) {
							return new Response(error.statusCode, error.message);
						}
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				return new Response(HttpCodesEnum.NOT_FOUND, "");
			default:
				logger.error("Requested resource does not exist", {
					messageCode: MessageCodes.RESOURCE_NOT_FOUND,
					resource: event.resource,
				});
				return new Response(HttpCodesEnum.NOT_FOUND, "Requested resource does not exist");
		}
	}
}

const handlerClass = new AbortHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
