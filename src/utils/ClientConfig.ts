import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../models/enums/MessageCodes";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { AppError } from "./AppError";

type ClientConfig = {
	jwksEndpoint: string;
	clientId: string;
	redirectUri: string;
	YotiBaseUrl: string;
	GovNotifyApi: string;
};

export function getClientConfig(clientConfig: string, sessionClientId: string, logger: Logger): ClientConfig | undefined {
	try {
		const config = JSON.parse(clientConfig) as ClientConfig[];
		const usersConfig = config.find(c => c.clientId === sessionClientId);
		return usersConfig;
	} catch (error) {
		logger.error("Invalid or missing client configuration table", {
			error,
			messageCode: MessageCodes.MISSING_CONFIGURATION,
		});
		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid or missing client config");
	}
}
