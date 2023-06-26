import { APIGatewayProxyEvent } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { Response, badRequestResponse, unauthorizedResponse } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "./services/DocumentSelectionRequestProcessor";
import { AppError } from "./utils/AppError";
import { getParameter } from "./utils/Config";
import { MessageCodes } from "./models/enums/MessageCodes";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.DOCUMENT_SELECTION_LOGGER_SVC_NAME;
const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

let YOTI_PRIVATE_KEY: string;
export class DocumentSelection implements LambdaInterface {
	private readonly YOTI_KEY_SSM_PATH = process.env.YOTI_KEY_SSM_PATH;

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		if (!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0) {
			logger.error("Environment variable SSM_PATH is not configured");
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}

		switch (event.resource) {
			case ResourcesEnum.DOCUMENTSELECTION:
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
									return badRequestResponse();
								}
							} else {
								logger.error("Missing header: session-id is required",
									{
										messageCode: MessageCodes.MISSING_SESSION_ID,
									});
								return badRequestResponse();
							}
						} else {
							logger.error("Empty headers",
								{
									messageCode: MessageCodes.EMPTY_HEADERS,
								});
							return badRequestResponse();
						}

						if (!YOTI_PRIVATE_KEY) {
							logger.info({ message: "Fetching key from SSM" });
							try {
								YOTI_PRIVATE_KEY = await getParameter(this.YOTI_KEY_SSM_PATH);
							} catch (error) {
								logger.error(`failed to get param from ssm at ${this.YOTI_KEY_SSM_PATH}`, {
									messageCode: MessageCodes.MISSING_CONFIGURATION,
									error,
								});
								return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
							}
						}
						logger.info("Starting DocumentSelectionRequestProcessor",
							{
								resource: event.resource,
							});
						return await DocumentSelectionRequestProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(event, sessionId);
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
const handlerClass = new DocumentSelection();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
