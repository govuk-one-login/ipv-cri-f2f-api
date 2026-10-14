import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { Response } from "./utils/Response";
import { ExpiredSessionsProcessor } from "./services/ExpiredSessionsProcessor";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { MessageCodes } from "./models/enums/MessageCodes";
import { APIGatewayProxyResult } from "aws-lambda";

const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME;

class Session implements LambdaInterface {
	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<APIGatewayProxyResult> {
		logger.resetKeys();
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			logger.info("Starting ExpiredSessionsProcessor");
			return await ExpiredSessionsProcessor.getInstance().processRequest();
		} catch (error: any) {
			const statusCode = error instanceof AppError ? error.statusCode : HttpCodesEnum.SERVER_ERROR;
			logger.error("An error has occurred.", { messageCode: MessageCodes.SERVER_ERROR });
			return Response(statusCode, "Server Error");
		}
	}
}

const lambdaHandler = new Session().handler.bind(new Session());
export { lambdaHandler };
