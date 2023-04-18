import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { Constants } from "../utils/Constants";
import { ServicesEnum } from "../models/enums/ServicesEnum";


/**
 * Class to read, store, and return environment variables used by this lambda
 */
export class EnvironmentVariables {

	private readonly GOVUKNOTIFY_TEMPLATE_ID = process.env.GOVUKNOTIFY_TEMPLATE_ID;

	private readonly GOVUKNOTIFY_MAX_RETRIES = process.env.GOVUKNOTIFY_MAX_RETRIES;

	private readonly GOVUKNOTIFY_BACKOFF_PERIOD_MS = process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS;

	private readonly YOTI_SDK = process.env.YOTISDK;

	private readonly YOTIBASEURL = process.env.YOTISDK;

	private readonly ISSUER = process.env.ISSUER;

	private readonly SESSION_TABLE = process.env.SESSION_TABLE;

	private readonly YOTI_KEY_SSM_PATH = process.env.YOTI_KEY_SSM_PATH;

	private readonly GOVUKNOTIFY_API_KEY_SSM_PATH = process.env.GOVUKNOTIFY_API_KEY_SSM_PATH;

	private readonly GOV_NOTIFY_QUEUE_URL = process.env.GOV_NOTIFY_QUEUE_URL;

	private readonly KMS_KEY_ARN = process.env.KMS_KEY_ARN;

	/**
	 * Constructor reads all necessary environment variables and stores them as class data.
	 * It also performs validation on env variable values. If certain variables have unexpected values the constructor will throw an error and/or log an error message
	 *
	 */
	constructor(logger: Logger, serviceType: ServicesEnum) {
		switch (serviceType) {
			case ServicesEnum.GOV_NOTIFY_SERVICE: {
				if (!this.ISSUER || this.ISSUER.trim().length === 0 ||
					!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0 ||
					!this.GOVUKNOTIFY_API_KEY_SSM_PATH || this.GOVUKNOTIFY_API_KEY_SSM_PATH.trim().length === 0) {
					logger.error(`GovNotifyService - Misconfigured external API's key ${EnvironmentVariables.name}`);
					throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
				}

				if (!this.GOVUKNOTIFY_BACKOFF_PERIOD_MS
					|| this.GOVUKNOTIFY_BACKOFF_PERIOD_MS.trim().length === 0
					|| +this.GOVUKNOTIFY_BACKOFF_PERIOD_MS.trim() === 0
					|| +this.GOVUKNOTIFY_BACKOFF_PERIOD_MS.trim() >= 60000) {
					this.GOVUKNOTIFY_BACKOFF_PERIOD_MS = "20000";
					logger.warn("GOVUKNOTIFY_BACKOFF_PERIOD_MS env var is not set. Setting to default - 20000");
				}

				if (!this.GOVUKNOTIFY_MAX_RETRIES
					|| this.GOVUKNOTIFY_MAX_RETRIES.trim().length === 0
					|| +this.GOVUKNOTIFY_MAX_RETRIES.trim() >= 100) {
					this.GOVUKNOTIFY_MAX_RETRIES = "3";
					logger.warn("GOVUKNOTIFY_MAX_RETRIES env var is not set. Setting to default - 3");
				}

				if (!this.YOTI_SDK || this.YOTI_SDK.trim().length === 0
					|| !this.YOTIBASEURL || this.YOTIBASEURL.trim().length === 0) {
					logger.error("Environment variable YOTI_SDK or YOTIBASEURL is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
				}
				break;
			}
			case ServicesEnum.USERINFO_SERVICE: {

				if (!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.KMS_KEY_ARN || this.KMS_KEY_ARN.trim().length === 0) {
					logger.error("Environment variable SESSION_TABLE or KMS_KEY_ARN is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "UserInfo Service incorrectly configured");
				}
				break;

			}
			case ServicesEnum.NA:
				break;
		}
	}

	/**
	 * Accessor method for env variable values
	 */

	getEmailTemplateId(logger: Logger): any {
		if (!this.GOVUKNOTIFY_TEMPLATE_ID || this.GOVUKNOTIFY_TEMPLATE_ID.trim().length === 0) {
			logger.error(`GovNotifyService - Misconfigured external API's key ${EnvironmentVariables.name}`);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		return this.GOVUKNOTIFY_TEMPLATE_ID;
	}

	maxRetries(): number {
		return +this.GOVUKNOTIFY_MAX_RETRIES!;
	}

	backoffPeriod(): number {
		return +this.GOVUKNOTIFY_BACKOFF_PERIOD_MS!;
	}

	yotiSdk(): any {
		return this.YOTI_SDK;
	}

	issuer(): any {
		return this.ISSUER;
	}

	sessionTable(): any {
		return this.SESSION_TABLE;
	}

	govNotifyApiKeySsmPath(): any {
		return this.GOVUKNOTIFY_API_KEY_SSM_PATH;
	}

	yotiKeySsmPath(): any {
		return this.YOTI_KEY_SSM_PATH;
	}

	getGovNotifyQueueURL(logger: Logger): string {
		if (!this.GOV_NOTIFY_QUEUE_URL || this.GOV_NOTIFY_QUEUE_URL.trim().length === 0) {
			logger.error(`GovNotifyService - Misconfigured external API's key ${EnvironmentVariables.name}`);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		return this.GOV_NOTIFY_QUEUE_URL;
	}

	kmsKeyArn(): any {
		return this.KMS_KEY_ARN;
	}

}
