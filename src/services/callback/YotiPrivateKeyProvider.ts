import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "../EnvironmentVariables";
import { getParameter } from "../../utils/Config";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { AppError } from "../../utils/AppError";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

export class YotiPrivateKeyProvider {
	private static yotiPrivateKey: string;

	static async getYotiPrivateKey(logger: Logger, environmentVariables: EnvironmentVariables): Promise<string> {
		if (!this.yotiPrivateKey) {
			try {
				logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
				this.yotiPrivateKey = await getParameter(environmentVariables.yotiKeySsmPath());
			} catch (error) {
				logger.error(`failed to get param from ssm at ${environmentVariables.yotiKeySsmPath()}`, {
					messageCode: MessageCodes.MISSING_CONFIGURATION,
					error,
				});
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
			}
		}
		return this.yotiPrivateKey;
	}
}
