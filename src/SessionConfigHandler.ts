import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { MessageCodes } from "./models/enums/MessageCodes";
import { SessionConfigRequestProcessor } from "./services/SessionConfigRequestProcessor";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : "F2F-CRI";
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : "DEBUG";
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.SESSIONCONFIG_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class SessionConfigHandler implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {

		try {
			logger.setPersistentLogAttributes({});
			logger.addContext(context);
	
			const { requestId } = event.requestContext;
			logger.info("Received session configuration request", { requestId });
	
			const { headers } = event;
			const sessionId = headers?.[Constants.X_SESSION_ID];
	
			if (!sessionId) {
				const errorMessage = "Missing header: x-govuk-signin-session-id is required";
				logger.error(errorMessage, { messageCode: MessageCodes.MISSING_HEADER });
				return new Response(HttpCodesEnum.BAD_REQUEST, errorMessage);
			}
	
			if (!Constants.REGEX_UUID.test(sessionId)) {
				const errorMessage = "Session id is not a valid uuid";
				logger.error(errorMessage, { messageCode: MessageCodes.FAILED_VALIDATING_SESSION_ID });
				return new Response(HttpCodesEnum.BAD_REQUEST, errorMessage);
			}
	
			logger.info("Starting SessionConfigRequestProcessor");
			return await SessionConfigRequestProcessor.getInstance(logger, metrics).processRequest(event, sessionId);
		} catch (err) {
			const errorMessage = "SessionConfigProcessor encoundered an error.";
			logger.error({ message: errorMessage, err });
			return err instanceof AppError
				? new Response(err.statusCode, err.message)
				: new Response(HttpCodesEnum.SERVER_ERROR, errorMessage);
		}
	}	

}

const handlerClass = new SessionConfigHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
