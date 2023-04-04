import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "./services/DocumentSelectionRequestProcessor";
import { AppError } from "./utils/AppError";
import { ssmClient, GetParameterCommand } from "./utils/SSMClient";
import { getParameter } from "./utils/Config";

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
	private readonly SSM_PATH = process.env.SSM_PATH;

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<Response> {
		if (!this.SSM_PATH || this.SSM_PATH.trim().length === 0) {
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
							if (sessionId) {
								logger.info({ message: "Session id", sessionId });
								if (!Constants.REGEX_UUID.test(sessionId)) {
									return new Response(HttpCodesEnum.BAD_REQUEST, "Session id must be a valid uuid");
								}
							} else {
								return new Response(HttpCodesEnum.BAD_REQUEST, "Missing header: session-id is required");
							}
						} else {
							return new Response(HttpCodesEnum.BAD_REQUEST, "Empty headers");
						}

						if (!YOTI_PRIVATE_KEY) {
							logger.info({ message: "Fetching key from SSM" });
							try {
								YOTI_PRIVATE_KEY = await getParameter(this.SSM_PATH);
							} catch (err) {
								logger.error(`failed to get param from ssm at ${this.SSM_PATH}`, { err });
								throw err;
							}
						}
						return await DocumentSelectionRequestProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(event, sessionId);
					} catch (err) {
						logger.error({ message: "An error has occurred. ", err });
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				return new Response(HttpCodesEnum.NOT_FOUND, "");

			default:
				throw new AppError(HttpCodesEnum.NOT_FOUND, "Requested resource does not exist" + { resource: event.resource });

		}
	}
}
const handlerClass = new DocumentSelection();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
