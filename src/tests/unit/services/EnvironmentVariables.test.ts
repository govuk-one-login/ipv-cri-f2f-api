import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "../../../services/EnvironmentVariables";
import { ServicesEnum } from "../../../models/enums/ServicesEnum";

describe("EnvironmentVariables", () => {
	let logger: Logger;
	beforeEach(() => {
		logger = new Logger();
	});

	describe("maxRetries", () => {
		it("should return the value of GOVUKNOTIFY_MAX_RETRIES as a number", () => {
			process.env.GOVUKNOTIFY_MAX_RETRIES = "3";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.maxRetries();

			expect(result).toBe(3);
		});
	});

	describe("backoffPeriod", () => {
		it("should return the value of GOVUKNOTIFY_BACKOFF_PERIOD_MS as a number", () => {
			process.env.GOVUKNOTIFY_BACKOFF_PERIOD_MS = "20000";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.backoffPeriod();

			expect(result).toBe(20000);
		});
	});

	describe("yotiSdk", () => {
		it("should return the value of YOTI_SDK", () => {
			process.env.YOTISDK = "YOTI_SDK_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.yotiSdk();

			expect(result).toBe("YOTI_SDK_VALUE");
		});
	});

	describe("issuer", () => {
		it("should return the value of ISSUER", () => {
			process.env.ISSUER = "ISSUER_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.issuer();

			expect(result).toBe("ISSUER_VALUE");
		});
	});

	describe("sessionTable", () => {
		it("should return the value of SESSION_TABLE", () => {
			process.env.SESSION_TABLE = "SESSION_TABLE_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.sessionTable();

			expect(result).toBe("SESSION_TABLE_VALUE");
		});
	});

	describe("govNotifyApiKeySsmPath", () => {
		it("should return the value of GOVUKNOTIFY_API_KEY_SSM_PATH", () => {
			// pragma: allowlist nextline secret
			process.env.GOVUKNOTIFY_API_KEY_SSM_PATH = "GOVUKNOTIFY_API_KEY_SSM_PATH_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.govNotifyApiKeySsmPath();

			expect(result).toBe("GOVUKNOTIFY_API_KEY_SSM_PATH_VALUE");
		});
	});

	describe("yotiKeySsmPath", () => {
		it("should return the value of YOTI_KEY_SSM_PATH", () => {
			process.env.YOTI_KEY_SSM_PATH = "YOTI_KEY_SSM_PATH_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.yotiKeySsmPath();

			expect(result).toBe("YOTI_KEY_SSM_PATH_VALUE");
		});
	});

	describe("kmsKeyArn", () => {
		it("should return the value of KMS_KEY_ARN", () => {
			process.env.KMS_KEY_ARN = "KMS_KEY_ARN_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.kmsKeyArn();

			expect(result).toBe("KMS_KEY_ARN_VALUE");
		});
	});

	describe("dnsSuffix", () => {
		it("should return the value of DNSSUFFIX", () => {
			process.env.DNSSUFFIX = "DNSSUFFIX";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.dnsSuffix();

			expect(result).toBe("DNSSUFFIX");
		});
	});

	describe("encryptionKeyIds", () => {
		it("should return the value of ENCRYPTION_KEY_IDS", () => {
			process.env.ENCRYPTION_KEY_IDS = "ENCRYPTION_KEY_IDS_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.encryptionKeyIds();

			expect(result).toBe("ENCRYPTION_KEY_IDS_VALUE");
		});
	});

	describe("clientConfig", () => {
		it("should return the value of CLIENT_CONFIG", () => {
			process.env.CLIENT_CONFIG = "CLIENT_CONFIG_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.clientConfig();

			expect(result).toBe("CLIENT_CONFIG_VALUE");
		});
	});

	describe("authSessionTtlInSecs", () => {
		it("should return the value of AUTH_SESSION_TTL_IN_SECS", () => {
			process.env.AUTH_SESSION_TTL_SECS = "1814400";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.authSessionTtlInSecs();

			expect(result).toBe(1814400);
		});
	});

	describe("signingKeyIds", () => {
		it("should return the value of SIGNING_KEY_IDS", () => {
			process.env.SIGNING_KEY_IDS = "SIGNING_KEY_IDS_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.signingKeyIds();

			expect(result).toBe("SIGNING_KEY_IDS_VALUE");
		});
	});

	describe("jwksBucketName", () => {
		it("should return the value of JWKS_BUCKET_NAME", () => {
			process.env.JWKS_BUCKET_NAME = "JWKS_BUCKET_NAME_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.jwksBucketName();

			expect(result).toBe("JWKS_BUCKET_NAME_VALUE");
		});
	});

	describe("yotiCallbackUrl", () => {
		it("should return the value of YOTICALLBACKURL", () => {
			process.env.YOTICALLBACKURL = "YOTICALLBACKURL_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.yotiCallbackUrl();

			expect(result).toBe("YOTICALLBACKURL_VALUE");
		});
	});

	describe("personIdentityTableName", () => {
		it("should return the value of PERSON_IDENTITY_TABLE_NAME", () => {
			process.env.PERSON_IDENTITY_TABLE_NAME = "PERSON_IDENTITY_TABLE_NAME_VALUE";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.personIdentityTableName();

			expect(result).toBe("PERSON_IDENTITY_TABLE_NAME_VALUE");
		});
	});

	describe("resourcesTtlInSeconds", () => {
		it("should return the value of RESOURCES_TTL_SECS", () => {
			process.env.RESOURCES_TTL_SECS = "1209600";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.resourcesTtlInSeconds();

			expect(result).toBe(1209600);
		});
	});

	describe("clientSessionTokenTtlInDays", () => {
		it("should return the value of YOTI_SESSION_TTL_DAYS", () => {
			process.env.YOTI_SESSION_TTL_DAYS = "10";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.clientSessionTokenTtlInDays();

			expect(result).toBe(10);
		});
	});

	describe("yotiInstructionsPdfMaxRetries", () => {
		it("should return the value of YOTI_INSTRUCTIONS_PDF_MAX_RETRIES as a number", () => {
			process.env.YOTI_INSTRUCTIONS_PDF_MAX_RETRIES = "3";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.yotiInstructionsPdfMaxRetries();

			expect(result).toBe(3);
		});
	});

	describe("yotiInstructionsPdfBackoffPeriod", () => {
		it("should return the value of YOTI_INSTRUCTIONS_PDF_BACKOFF_PERIOD_MS as a number", () => {
			process.env.YOTI_INSTRUCTIONS_PDF_BACKOFF_PERIOD_MS = "5000";
			const envVars = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

			const result = envVars.yotiInstructionsPdfBackoffPeriod();

			expect(result).toBe(5000);
		});
	});
});
