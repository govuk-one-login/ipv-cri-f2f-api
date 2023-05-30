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

	private GOVUKNOTIFY_MAX_RETRIES = process.env.GOVUKNOTIFY_MAX_RETRIES;

	private GOVUKNOTIFY_BACKOFF_PERIOD_MS = process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS;

	private readonly YOTI_SDK = process.env.YOTISDK;

	private readonly YOTIBASEURL = process.env.YOTIBASEURL;

	private readonly ISSUER = process.env.ISSUER;

	private readonly SESSION_TABLE = process.env.SESSION_TABLE;

	private readonly YOTI_KEY_SSM_PATH = process.env.YOTI_KEY_SSM_PATH;

	private readonly GOVUKNOTIFY_API_KEY_SSM_PATH = process.env.GOVUKNOTIFY_API_KEY_SSM_PATH;

	private readonly GOV_NOTIFY_QUEUE_URL = process.env.GOV_NOTIFY_QUEUE_URL;

	private readonly IPV_CORE_QUEUE_URL = process.env.IPV_CORE_QUEUE_URL;

	private readonly KMS_KEY_ARN = process.env.KMS_KEY_ARN;

	private readonly CLIENT_CONFIG = process.env.CLIENT_CONFIG;

	private readonly ENCRYPTION_KEY_IDS = process.env.ENCRYPTION_KEY_IDS;

	private readonly AUTH_SESSION_TTL = process.env.AUTH_SESSION_TTL;

	private readonly SIGNING_KEY_IDS = process.env.SIGNING_KEY_IDS;

	private readonly JWKS_BUCKET_NAME = process.env.JWKS_BUCKET_NAME;

	private readonly TXMA_QUEUE_URL = process.env.TXMA_QUEUE_URL;

	private readonly PERSON_IDENTITY_TABLE_NAME = process.env.PERSON_IDENTITY_TABLE_NAME;

	private readonly YOTICALLBACKURL = process.env.YOTICALLBACKURL;

	private CLIENT_SESSION_TOKEN_TTL_SECS = process.env.CLIENT_SESSION_TOKEN_TTL_SECS;

	private RESOURCES_TTL_SECS = process.env.RESOURCES_TTL_SECS;

	/*
	 * This function performs validation on env variable values.
	 * If certain variables have unexpected values the constructor will throw an error and/or log an error message
	 */
	private verifyEnvVariablesByServiceType(serviceType: ServicesEnum, logger: Logger): void {
		switch (serviceType) {
			case ServicesEnum.GOV_NOTIFY_SERVICE: {
				if (!this.ISSUER || this.ISSUER.trim().length === 0 ||
					!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0 ||
					!this.TXMA_QUEUE_URL || this.TXMA_QUEUE_URL.trim().length === 0 ||
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

				if (!this.CLIENT_SESSION_TOKEN_TTL_SECS || this.CLIENT_SESSION_TOKEN_TTL_SECS.trim().length === 0) {
					this.CLIENT_SESSION_TOKEN_TTL_SECS = "950400";
					logger.warn("CLIENT_SESSION_TOKEN_TTL_SECS env var is not set. Setting to default - 11 days.");
				}
				if (!this.RESOURCES_TTL_SECS	|| this.RESOURCES_TTL_SECS.trim().length === 0) {
					this.RESOURCES_TTL_SECS = "1036800";
					logger.warn("RESOURCES_TTL_SECS env var is not set. Setting to default - 12 days.");
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
			case ServicesEnum.ACCESS_TOKEN_SERVICE: {

				if (!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.KMS_KEY_ARN || this.KMS_KEY_ARN.trim().length === 0 ||
					!this.ISSUER || this.ISSUER.trim().length === 0) {
					logger.error("Environment variable SESSION_TABLE or KMS_KEY_ARN or ISSUER is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "AccessToken Service incorrectly configured");
				}
				break;

			}
			case ServicesEnum.SESSION_SERVICE: {

				if (!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.CLIENT_CONFIG || this.CLIENT_CONFIG.trim().length === 0 ||
					!this.ENCRYPTION_KEY_IDS || this.ENCRYPTION_KEY_IDS.trim().length === 0 ||
					!this.AUTH_SESSION_TTL || this.AUTH_SESSION_TTL.trim().length === 0 ||
					!this.ISSUER || this.ISSUER.trim().length === 0 ||
					!this.TXMA_QUEUE_URL || this.TXMA_QUEUE_URL.trim().length === 0) {
					logger.error("Environment variable SESSION_TABLE or CLIENT_CONFIG or ENCRYPTION_KEY_IDS or AUTH_SESSION_TTL is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "Session Service incorrectly configured");
				}
				break;

			}
			case ServicesEnum.JWKS_SERVICE: {

				if (!this.ENCRYPTION_KEY_IDS || this.ENCRYPTION_KEY_IDS.trim().length === 0 ||
					!this.SIGNING_KEY_IDS || this.SIGNING_KEY_IDS.trim().length === 0 ||
					!this.JWKS_BUCKET_NAME || this.JWKS_BUCKET_NAME.trim().length === 0) {
					logger.error("Environment variable ENCRYPTION_KEY_IDS or SIGNING_KEY_IDS or JWKS_BUCKET_NAME is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "JWKS Service handler incorrectly configured");
				}
				break;

			}
			case ServicesEnum.AUTHORIZATION_SERVICE: {

				if (!this.SESSION_TABLE || this.SESSION_TABLE.trim().length === 0 ||
					!this.TXMA_QUEUE_URL || this.TXMA_QUEUE_URL.trim().length === 0 ||
					!this.ISSUER || this.ISSUER.trim().length === 0) {
					logger.error("Environment variable SESSION_TABLE or TXMA_QUEUE_URL or ISSUER is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "Authorization Service incorrectly configured");
				}
				break;

			}
			case ServicesEnum.DOCUMENT_SELECTION_SERVICE: {
				if (!this.PERSON_IDENTITY_TABLE_NAME || this.PERSON_IDENTITY_TABLE_NAME.trim().length === 0 ||
					!this.YOTICALLBACKURL || this.YOTICALLBACKURL.trim().length === 0 ||
					!this.YOTI_SDK || this.YOTI_SDK.trim().length === 0 ||
					!this.ISSUER || this.ISSUER.trim().length === 0 ||
					!this.TXMA_QUEUE_URL || this.TXMA_QUEUE_URL.trim().length === 0 ||
					!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0 ||
					!this.YOTIBASEURL || this.YOTIBASEURL.trim().length === 0) {
					logger.error("Environment variable PERSON_IDENTITY_TABLE_NAME or YOTI_SDK or YOTICALLBACKURL or ISSUER is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "DocumentSelection Service incorrectly configured");
				}
				if (!this.CLIENT_SESSION_TOKEN_TTL_SECS || this.CLIENT_SESSION_TOKEN_TTL_SECS.trim().length === 0) {
					this.CLIENT_SESSION_TOKEN_TTL_SECS = "950400";
					logger.warn("CLIENT_SESSION_TOKEN_TTL_SECS env var is not set. Setting to default - 11 days.");
				}
				if (!this.RESOURCES_TTL_SECS	|| this.RESOURCES_TTL_SECS.trim().length === 0) {
					this.RESOURCES_TTL_SECS = "1036800";
					logger.warn("RESOURCES_TTL_SECS env var is not set. Setting to default - 12 days.");
				}
				break;
			}
			case ServicesEnum.CALLBACK_SERVICE: {
				if (!this.PERSON_IDENTITY_TABLE_NAME || this.PERSON_IDENTITY_TABLE_NAME.trim().length === 0 ||
					!this.YOTI_SDK || this.YOTI_SDK.trim().length === 0 ||
					!this.ISSUER || this.ISSUER.trim().length === 0 ||
					!this.TXMA_QUEUE_URL || this.TXMA_QUEUE_URL.trim().length === 0 ||
					!this.YOTI_KEY_SSM_PATH || this.YOTI_KEY_SSM_PATH.trim().length === 0 ||
					!this.YOTIBASEURL || this.YOTIBASEURL.trim().length === 0) {
					logger.error("Environment variable PERSON_IDENTITY_TABLE_NAME or YOTI_SDK or YOTICALLBACKURL or ISSUER is not configured");
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "DocumentSelection Service incorrectly configured");
				}
				if (!this.CLIENT_SESSION_TOKEN_TTL_SECS || this.CLIENT_SESSION_TOKEN_TTL_SECS.trim().length === 0) {
					this.CLIENT_SESSION_TOKEN_TTL_SECS = "950400";
					logger.warn("CLIENT_SESSION_TOKEN_TTL_SECS env var is not set. Setting to default - 11 days.");
				}
				if (!this.RESOURCES_TTL_SECS	|| this.RESOURCES_TTL_SECS.trim().length === 0) {
					this.RESOURCES_TTL_SECS = "1036800";
					logger.warn("RESOURCES_TTL_SECS env var is not set. Setting to default - 12 days.");
				}
				break;
			}
			default:
				break;
		}
	}

	/**
	 * Constructor reads all necessary environment variables by ServiceType
	 */
	constructor(logger: Logger, serviceType: ServicesEnum) {
		this.verifyEnvVariablesByServiceType(serviceType, logger);
	}

	/**
	 * Accessor methods for env variable values
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

	yotiBaseUrl(): any {
		return this.YOTIBASEURL;
	}

	getGovNotifyQueueURL(logger: Logger): string {
		if (!this.GOV_NOTIFY_QUEUE_URL || this.GOV_NOTIFY_QUEUE_URL.trim().length === 0) {
			logger.error(`GovNotifyService - Misconfigured external API's key ${EnvironmentVariables.name}`);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		return this.GOV_NOTIFY_QUEUE_URL;
	}

	getIpvCoreQueueURL(logger: Logger): string {
		if (!this.IPV_CORE_QUEUE_URL || this.IPV_CORE_QUEUE_URL.trim().length === 0) {
			logger.error(`GovNotifyService - Misconfigured external API's key ${EnvironmentVariables.name}`);
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
		return this.IPV_CORE_QUEUE_URL;
	}

	kmsKeyArn(): any {
		return this.KMS_KEY_ARN;
	}

	encryptionKeyIds(): any {
		return this.ENCRYPTION_KEY_IDS;
	}

	clientConfig(): any {
		return this.CLIENT_CONFIG;
	}

	authSessionTtl(): any {
		return this.AUTH_SESSION_TTL;
	}

	signingKeyIds(): any {
		return this.SIGNING_KEY_IDS;
	}

	jwksBucketName(): any {
		return this.JWKS_BUCKET_NAME;
	}

	yotiCallbackUrl(): any {
		return this.YOTICALLBACKURL;
	}

	personIdentityTableName(): any {
		return this.PERSON_IDENTITY_TABLE_NAME;
	}

	resourcesTtlInSeconds(): any {
		return this.RESOURCES_TTL_SECS;
	}

	clientSessionTokenTtlInSeconds(): any {
		return this.CLIENT_SESSION_TOKEN_TTL_SECS;
	}

}
