import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getParameter } from "./utils/Config";
import { Response } from "./utils/Response";
import { GenerateYotiLetterProcessor } from "./services/GenerateYotiLetterProcessor";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = Constants.GENERATE_YOTI_LETTER_SVC_NAME,
} = process.env;


const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

let YOTI_PRIVATE_KEY: string;
export class GenerateYotiLetterHandler implements LambdaInterface {
	private readonly YOTI_KEY_SSM_PATH = process.env.YOTI_KEY_SSM_PATH;

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<any> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		if (!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0) {
			logger.error("Environment variable SSM_PATH is not configured");
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		try {
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
			return await GenerateYotiLetterProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY).processRequest(event);
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
}
const handlerClass = new GenerateYotiLetterHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
