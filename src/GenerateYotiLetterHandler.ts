import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getParameter } from "./utils/Config";
import { Response } from "./utils/Response";
import { GenerateYotiLetterProcessor } from "./services/GenerateYotiLetterProcessor";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { ServicesEnum } from "./models/enums/ServicesEnum";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = Constants.GENERATE_YOTI_LETTER_SVC_NAME,
} = process.env;


export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

let yotiPrivateKey: string;

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE });

export class GenerateYotiLetterHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.PERSON_INFO_KEY_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<any> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);
		try {
			try {
				const yotiPrivateKeyPath = this.environmentVariables.yotiKeySsmPath();
				logger.info({ message: "Fetching key", yotiPrivateKeyPath });
				yotiPrivateKey = await getParameter(yotiPrivateKeyPath);

			} catch (error: any) {
				logger.error({ message: "Error fetching key", error, messageCode: MessageCodes.SERVER_ERROR });
				return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
			}

			return await GenerateYotiLetterProcessor.getInstance(logger, metrics, yotiPrivateKey).processRequest(event);

		} catch (error: any) {
			logger.error({ message: "An error has occurred",
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
