import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { UserInfoRequestProcessor } from "./services/UserInfoRequestProcessor";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { MessageCodes } from "./models/enums/MessageCodes";

const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME;

class UserInfo implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {

		// clear logger state set by any previous invocation, and add lambda context for this invocation
		logger.resetKeys();
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			logger.info("Received userInfo request:", { requestId: event.requestContext.requestId });
			logger.info("Starting UserInfoRequestProcessor");
			return await UserInfoRequestProcessor.getInstance().processRequest(event);
		} catch (err) {
			logger.error({ message: "An error has occurred. ", err }, { messageCode: MessageCodes.SERVER_ERROR });
			return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
		}
	}
}
const handlerClass = new UserInfo();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
