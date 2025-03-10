import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { Constants } from "./utils/Constants";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "./services/DocumentSelectionRequestProcessor";
import { AppError } from "./utils/AppError";
import { getParameter } from "./utils/Config";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getSessionIdHeaderErrors } from "./utils/Validations";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.DOCUMENT_SELECTION_LOGGER_SVC_NAME;
export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

let YOTI_PRIVATE_KEY: string;
export class DocumentSelection implements LambdaInterface {
	private readonly YOTI_KEY_SSM_PATH = process.env.YOTI_KEY_SSM_PATH;

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		if (!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0) {
			logger.error("Environment variable SSM_PATH is not configured");
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		try {
			const { sessionId, encodedHeader } = this.validateEvent(event);

			if (!YOTI_PRIVATE_KEY) {
				logger.info({ message: "Fetching key from SSM" });
				try {
					YOTI_PRIVATE_KEY = await getParameter(this.YOTI_KEY_SSM_PATH);
				} catch (error) {
					logger.error(`failed to get param from ssm at ${this.YOTI_KEY_SSM_PATH}`, {
						messageCode: MessageCodes.MISSING_CONFIGURATION,
						error,
					});
					return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
				}
			}
			return await DocumentSelectionRequestProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(event, sessionId, encodedHeader);
		} catch (error) {
			logger.error({ message: "An error has occurred. ",
				error,
				messageCode: MessageCodes.SERVER_ERROR,
			});
			if (error instanceof AppError) {
				return Response(error.statusCode, error.message);
			}
			return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
		}
	}

	validateEvent(event: APIGatewayProxyEvent): { sessionId: string; encodedHeader: string } {
		if (!event.headers) {			
			const message = "Invalid request: missing headers";
			logger.error({ message, messageCode: MessageCodes.MISSING_HEADER });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		}

		const sessionIdError = getSessionIdHeaderErrors(event.headers);
		if (sessionIdError) {
			logger.error({ message: sessionIdError, messageCode: MessageCodes.INVALID_SESSION_ID });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, sessionIdError);
		}

		return {
			sessionId: event.headers[Constants.X_SESSION_ID]!,
			encodedHeader: event.headers[Constants.ENCODED_AUDIT_HEADER] ?? "",
		};
	}
}
const handlerClass = new DocumentSelection();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
