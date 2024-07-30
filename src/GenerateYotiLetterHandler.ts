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
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GENERATE_YOTI_LETTER_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: { sessionId: string; pdfPreference: string }, context: any): Promise<any> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);
		this.validateEvent(event);
		try {
			try {
				const yotiPrivateKeyPath = this.environmentVariables.yotiKeySsmPath();
				logger.info({ message: "Fetching Yoti private key", yotiPrivateKeyPath });
				yotiPrivateKey = await getParameter(yotiPrivateKeyPath);

			} catch (error: any) {
				logger.error({ message: "Error fetching Yoti private key", error, messageCode: MessageCodes.SERVER_ERROR });
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

	validateEvent(event: { sessionId: string; pdfPreference: string }):void {
		if (!event.pdfPreference) {			
			const message = "Invalid request: missing pdfPreference";
			logger.error({ message, messageCode: MessageCodes.MISSING_PCL_PREFERENCE });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		} else if (!event.sessionId) {
			const message = "Invalid request: missing sessionId";
			logger.error({ message, messageCode: MessageCodes.MISSING_SESSION_ID });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		} else if (!Constants.REGEX_UUID.test(event.sessionId)) {
			const message = "Invalid request: sessionId is not a valid uuid";
			logger.error({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		}
	}
}
const handlerClass = new GenerateYotiLetterHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
