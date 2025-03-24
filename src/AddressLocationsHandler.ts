import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AddressLocationsProcessor } from "./services/AddressLocationsProcessor";
import { HttpCodesEnum } from "./models/enums/HttpCodesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getParameter } from "./utils/Config";
import { Constants } from "./utils/Constants";
import { AppError } from "./utils/AppError";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { Response } from "./utils/Response";
import { getSessionIdHeaderErrors } from "./utils/Validations";
import { ServicesEnum } from "./models/enums/ServicesEnum";

const { POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE, POWERTOOLS_LOG_LEVEL = "DEBUG", POWERTOOLS_SERVICE_NAME = Constants.ADDRESS_LOCATIONS_LOGGER_SVC_NAME } = process.env;

export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

let OS_API_KEY: string;

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

export class AddressLocationsHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.ADDRESS_LOCATIONS_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		try {
			const { sessionId, postcode } = this.validateEvent(event);
			const osApiKeyPath = this.environmentVariables.oSAPIKeySsmPath();
			OS_API_KEY = OS_API_KEY ?? await getParameter(osApiKeyPath);

			logger.info("Starting AddressLocationsProcessor");
			return await AddressLocationsProcessor.getInstance(logger, metrics, OS_API_KEY).processRequest(sessionId, postcode);
		} catch (error: any) {
			logger.error({ message: "AddressLocationsProcessor encountered an error.", error, messageCode: MessageCodes.SERVER_ERROR });
			metrics.addMetric("AddressLocations_failed_to_retrieve_address", MetricUnits.Count, 1);

			if (error instanceof AppError) {
				return Response(error.statusCode, error.message);
			}
			return Response(HttpCodesEnum.SERVER_ERROR, "Server Error");
		}
	}

	validateEvent(event: APIGatewayProxyEvent): { sessionId: string; postcode: string } {
		if (!event.headers) {
			const message = "Invalid request: missing headers";
			logger.error({ message, messageCode: MessageCodes.MISSING_HEADER });
			throw new AppError(HttpCodesEnum.BAD_REQUEST, message);
		}

		const sessionId = event.headers[Constants.X_SESSION_ID]!;
  		const postcode = event.headers[Constants.POSTCODE_HEADER]!;

		const sessionIdError = getSessionIdHeaderErrors(event.headers);
		if (sessionIdError) {
			logger.error({ message: sessionIdError, messageCode: MessageCodes.INVALID_SESSION_ID });
			throw new AppError(HttpCodesEnum.BAD_REQUEST, sessionIdError);
		}
		
		if (!postcode) {
			const message = "Invalid request: missing postcode";
			logger.error({ message, messageCode: MessageCodes.MISSING_POSTCODE });
			throw new AppError(HttpCodesEnum.BAD_REQUEST, message);
		}

		return { sessionId, postcode };
	}
}

const handlerClass = new AddressLocationsHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
