import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { ClaimedIdRequestProcessor } from "./services/ClaimedIdRequestProcessor";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { HttpVerbsEnum } from "./utils/HttpVerbsEnum";
import { Constants } from "./utils/Constants";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.CLAIMEDID_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.CLAIMEDID_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class ClaimedIdentity implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		switch (event.resource) {
			case ResourcesEnum.CLAIMEDIDENTITY:
				if (event.httpMethod === HttpVerbsEnum.POST) {
					let sessionId;
					try {
						logger.info("Event received", { event });
						if (event.headers) {
							sessionId = event.headers[Constants.X_SESSION_ID];
							if (sessionId) {
								logger.info({ message: "Session id", sessionId });
								if (!Constants.REGEX_UUID.test(sessionId)) {
									return new Response(HttpCodesEnum.BAD_REQUEST, "Session id must be a valid uuid");
								}
							} else {
								return new Response(HttpCodesEnum.BAD_REQUEST, "Missing header: x-govuk-signin-session-id is required");
							}
						} else {
							return new Response(HttpCodesEnum.BAD_REQUEST, "Empty headers");
						}

						if (event.body) {
							return await ClaimedIdRequestProcessor.getInstance(logger, metrics).processRequest(event, sessionId);
						} else {
							return new Response(HttpCodesEnum.BAD_REQUEST, "Empty payload");
						}
					} catch (err: any) {
						logger.error({ message: "An error has occurred.", err });
						if (err instanceof AppError) {
							return new Response(err.statusCode, err.message);
						}
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				return new Response(HttpCodesEnum.NOT_FOUND, "");

			default:
				throw new AppError("Requested resource does not exist" + { resource: event.resource }, HttpCodesEnum.NOT_FOUND);
		}

	}

}
const handlerClass = new ClaimedIdentity();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
