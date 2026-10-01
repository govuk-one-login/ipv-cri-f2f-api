import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { metrics } from "@govuk-one-login/cri-metrics";
import { logger } from "@govuk-one-login/cri-logger";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { AccessTokenRequestProcessor } from "./services/AccessTokenRequestProcessor";
import { MessageCodes } from "./models/enums/MessageCodes";
import { AppError } from "./utils/AppError";

export class AccessToken implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {

		// clear logger state set by any previous invocation, and add lambda context for this invocation
		logger.resetKeys();
		logger.addContext(context);

		try {
			logger.info("Received token request", { requestId: event.requestContext.requestId });
			logger.info("Starting AccessTokenRequestProcessor");
			return await AccessTokenRequestProcessor.getInstance().processRequest(event);
		} catch (error) {
			logger.error({ message: "AccessTokenRequestProcessor encountered an error.",
				error,
				messageCode: MessageCodes.SERVER_ERROR,
			});
			if (error instanceof AppError) {
				return Response(error.statusCode, error.message);
			}
			return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
		}
	}
}

const handlerClass = new AccessToken();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
