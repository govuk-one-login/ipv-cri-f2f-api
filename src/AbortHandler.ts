import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "./models/enums/MessageCodes";
import { Constants } from "./utils/Constants";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { Response } from "./utils/Response";
import { AppError } from "./utils/AppError";
import { AbortRequestProcessor } from "./services/AbortRequestProcessor";
import { getSessionIdHeaderErrors } from "./utils/Validations";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.ABORT_LOGGER_SVC_NAME;
export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

export class AbortHandler implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })

	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);
		try {
			const { sessionId, encodedHeader } = this.validateEvent(event);
			logger.info("Starting AbortRequestProcessor");
			return await AbortRequestProcessor.getInstance(logger, metrics).processRequest(sessionId, encodedHeader);
		} catch (error) {
			logger.error({ message: "AbortRequestProcessor encoundered an error.",
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

const handlerClass = new AbortHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
