import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { Constants } from "../utils/Constants";


/**
 * Class to read, store, and return environment variables used by this lambda
 */
export class EnvironmentVariables {

	private readonly GOVUKNOTIFY_API_KEY = process.env.GOVUKNOTIFY_API_KEY;

	private readonly GOVUKNOTIFY_TEMPLATE_ID = process.env.GOVUKNOTIFY_TEMPLATE_ID;

	private readonly GOVUKNOTIFY_MAX_RETRIES = process.env.GOVUKNOTIFY_MAX_RETRIES;

	private readonly GOVUKNOTIFY_BACKOFF_PERIOD_MS = process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS;

	private readonly YOTI_SDK = process.env.YOTISDK;

	private readonly YOTIBASEURL = process.env.YOTISDK;

	private readonly ISSUER = process.env.ISSUER;

	private readonly SESSION_TABLE = process.env.SESSION_TABLE;

	/**
	 * Constructor reads all necessary environment variables and stores them as class data.
	 * It also performs validation on env variable values. If certain variables have unexpected values the constructor will throw an error and/or log an error message
	 *
	 * @param EMAIL_ENABLED
	 * @param GOVUKNOTIFY_API_KEY
	 * @param GOVUKNOTIFY_TEMPLATE_ID
	 * @param GOVUKNOTIFY_MAX_RETRIES
	 * @param GOVUKNOTIFY_BACKOFF_PERIOD_MS
	 * @param YOTI_SDK
	 * @param YOTIBASEURL
	 * @param ISSUER
	 * @param SESSION_TABLE
	 */
	constructor(logger: Logger) {

		if (!this.GOVUKNOTIFY_API_KEY || this.GOVUKNOTIFY_API_KEY.trim().length === 0 ||
			!this.GOVUKNOTIFY_TEMPLATE_ID || this.GOVUKNOTIFY_TEMPLATE_ID.trim().length === 0 ||
			!this.ISSUER || this.ISSUER.trim().length === 0 ||
			!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0) {
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
	}

	/**
	 * Accessor method for env variable values
	 */

	apiKey(): any {
		return this.GOVUKNOTIFY_API_KEY;
	}

	templateId(): any {
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

}
