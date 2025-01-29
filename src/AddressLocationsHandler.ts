import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HttpCodesEnum } from "./models/enums/HttpCodesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { getParameter } from "./utils/Config";
import { Constants } from "./utils/Constants";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { Response } from "./utils/Response";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { AppError } from "./utils/AppError";
import axios from "axios";
import { getClientConfig } from "./utils/ClientConfig";

const { POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE, POWERTOOLS_LOG_LEVEL = "DEBUG", POWERTOOLS_SERVICE_NAME = Constants.ADDRESS_LOCATIONS_LOGGER_SVC_NAME } = process.env;

export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

let key: string;
let osData: string;

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

export class AddressLocationsHandler implements LambdaInterface {
    private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.ADDRESS_LOCATIONS_SERVICE);

    @metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })

    async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
    	logger.setPersistentLogAttributes({});
    	logger.addContext(context);

		const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSessionInfo.clientId, logger);

		if (!clientConfig) {
			logger.error("Unrecognised client in request", {
				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
		});
		return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
	}

    	try {
			const postCode = this.validateEvent(event).postCode;
    		const OSApiKeyPath = this.environmentVariables.oSAPIKeySsmPath();
    		logger.info({ message: "Fetching key", OSApiKeyPath });

    	key = await getParameter(OSApiKeyPath);
		osData = await this.getOsLocations(postCode, key, clientConfig.);
		return Response(HttpCodesEnum.OK, JSON.stringify({ osData }));

    	} catch (error: any) {
    		logger.error({ message: "Error fetching OS API key", error, messageCode: MessageCodes.SERVER_ERROR });
    		return Response(HttpCodesEnum.SERVER_ERROR, "Server Error");
    	}
    }

	validateEvent(event: APIGatewayProxyEvent): { postCode: string; } {
		if (!event.headers) {			
			const message = "Invalid request: missing headers";
			logger.error({ message, messageCode: MessageCodes.MISSING_HEADER });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		}

		return {
			postCode: event.headers.postCode!
		};
	}

	async getOsLocations(postCode: string, key: string, url: string): Promise<string>{
		const { data } = await axios.get(
			`${url}postcode=${postCode}&key=${key}`
		);
		return data.results;
	}
}

const handlerClass = new AddressLocationsHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
