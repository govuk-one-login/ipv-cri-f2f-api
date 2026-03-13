import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "../EnvironmentVariables";
import { getParameter } from "../../utils/Config";

export class YotiPrivateKeyProvider {
	private static yotiPrivateKey: string;

	static async getYotiPrivateKey(logger: Logger, environmentVariables: EnvironmentVariables): Promise<string> {
		if (!this.yotiPrivateKey) {
			logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
			this.yotiPrivateKey = await getParameter(environmentVariables.yotiKeySsmPath());
		}
		return this.yotiPrivateKey;
	}
}
