import { YotiService } from "../services/YotiService";
import { AppError } from "./AppError";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { EnvironmentVariables } from "../services/EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";

interface ClientConfig {
	jwksEndpoint: string;
	clientId: string;
	redirectUri: string;
	YOTIBASEURL: string;
	YOTISDK: string;
}

export const createYotiService = (sessionClientId: string, YOTI_PRIVATE_KEY: string, environmentVariables: EnvironmentVariables, logger: Logger) => {
	let yotiService: YotiService;

	const config = JSON.parse(environmentVariables.clientConfig()) as ClientConfig[];
	const configClient = config.find(c => c.clientId === sessionClientId);

	console.log('logger', logger);
	if (configClient?.YOTISDK && configClient.YOTIBASEURL) {
		logger.info({ message: "Creating Yoti Service" });
		yotiService = YotiService.getInstance(logger, configClient?.YOTISDK, environmentVariables.resourcesTtlInSeconds(), environmentVariables.clientSessionTokenTtlInDays(), YOTI_PRIVATE_KEY, configClient.YOTIBASEURL);
	} else {
		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing YOTI Config");
	}

	return yotiService;
};
