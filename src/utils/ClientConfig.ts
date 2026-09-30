import { logger } from "@govuk-one-login/cri-logger";
import { MessageCodes } from "../models/enums/MessageCodes";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { AppError } from "./AppError";

type ClientConfig = {
	jwksEndpoint: string;
	clientId: string;
	redirectUri: string;
	YotiBaseUrl: string;
	GovNotifyApi: string;
	OsLocationsApi: string;
};

export function getClientConfig(clientConfig: string, sessionClientId: string): ClientConfig | undefined {
	try {
		logger.info("CLIENT_ID", sessionClientId);
		const config = JSON.parse(clientConfig) as ClientConfig[];
		const usersConfig = config.find(c => c.clientId === sessionClientId);

		logger.info("CLIENT_CONFIG", {
			client_id: sessionClientId,
			usersConfig,
		});

		return usersConfig;
	} catch (error) {
		logger.error("Invalid or missing client configuration table", {
			error,
			sessionClientId,
			messageCode: MessageCodes.MISSING_CONFIGURATION,
		});
		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid or missing client config");
	}
}
