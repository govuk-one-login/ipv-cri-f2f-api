import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "./F2fService";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Response } from "../utils/Response";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { APIGatewayProxyResult } from "aws-lambda";
import { getClientConfig } from "../utils/ClientConfig";
import axios from "axios";
import { AppError } from "../utils/AppError";

export class AddressLocationsProcessor {
	private static instance: AddressLocationsProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly f2fService: F2fService;

	private readonly osApiKey: string;

	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics, osApiKey: string) {
		this.osApiKey = osApiKey;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.ADDRESS_LOCATIONS_SERVICE);
		this.logger = logger;
  		this.metrics = metrics;
  		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
	}

	static getInstance(logger: Logger, metrics: Metrics, osApiKey: string): AddressLocationsProcessor {
  	if (!AddressLocationsProcessor.instance) {
			AddressLocationsProcessor.instance = new AddressLocationsProcessor(logger, metrics, osApiKey);
  	}
  	return AddressLocationsProcessor.instance;
	}

	async processRequest(sessionId: string, postCode: string): Promise<APIGatewayProxyResult> {
		
		const session = await this.f2fService.getSessionById(sessionId);
		if (!session) {
			this.logger.error("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			return Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}

		this.logger.appendKeys({
			govuk_signin_journey_id: session?.clientSessionId,
		});
		
		const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), session.clientId, this.logger);
		this.logger.info("CLIENTS!:", { clientConfig });

		if (!clientConfig) {
			this.logger.error("Unrecognised client in request", {
				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
			});
			return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
		}

		const addressLocationsData = await this.getOsLocations(postCode, this.osApiKey, clientConfig.OsLocationsApi );

  	return Response(HttpCodesEnum.OK, addressLocationsData);
	}

	async getOsLocations(postCode: string, apiKey: string, osLocationsApiUrl: string): Promise<string> {
		try {
			const response = await axios.get(osLocationsApiUrl, 
				{
					params: {
						postcode: postCode,
						key: apiKey,
					},
				});
			this.logger.info("DATA!:", response.data, response.config);
			return JSON.stringify(response.data.results);
		} catch (error: any) {
			if (axios.isAxiosError(error)) {
				this.logger.error("Axios error:", error);
				this.logger.error("Error response data:", error.response?.data);
			  } else {
				this.logger.error("Error retrieving OS locations data:", error);
			  }
    		const message = "Error retrieving OS locations data";
			throw new AppError(HttpCodesEnum.BAD_REQUEST, message);
		}
	}
}
