import { AppCodes } from "../models/AppCodes";
import {Logger} from "@aws-lambda-powertools/logger";
import {AppError} from "../utils/AppError";
import {HttpCodesEnum} from "../models/enums/HttpCodesEnum";
import {Constants} from "../utils/Contants";


/**
 * Class to read, store, and return environment variables used by this lambda
 */
export class EnvironmentVariables {
	private readonly S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
	private readonly GOVUKNOTIFY_API_KEY = process.env.GOVUKNOTIFY_API_KEY;
	private readonly GOVUKNOTIFY_MAX_RETRIES = process.env.GOVUKNOTIFY_MAX_RETRIES;
	private readonly GOVUKNOTIFY_BACKOFF_PERIOD_MS = process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS;

	/**
	 * Constructor reads all necessary environment variables and stores them as class data.
	 * It also performs validation on env variable values. If certain variables have unexpected values the constructor will throw an error and/or log an error message
	 *
	 * @param EMAIL_ENABLED
	 * @param GOVUKNOTIFY_API_KEY
	 * @param GOVUKNOTIFY_MAX_RETRIES
	 * @param GOVUKNOTIFY_BACKOFF_PERIOD_MS
	 */
	constructor(logger: Logger) {

		if (!this.GOVUKNOTIFY_API_KEY || this.GOVUKNOTIFY_API_KEY.trim().length === 0 ||
			!this.S3_BUCKET_NAME || this.S3_BUCKET_NAME.trim().length === 0) {
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
	}

	/**
	 * Accessor method for env variable values
	 */

	s3BucketName(): any {
		return this.S3_BUCKET_NAME;
	}

	apiKey(): any {
		return this.GOVUKNOTIFY_API_KEY;
	}

	maxRetries(): number {
		return +this.GOVUKNOTIFY_MAX_RETRIES!;
	}

	backoffPeriod(): number {
		return +this.GOVUKNOTIFY_BACKOFF_PERIOD_MS!;
	}
}
