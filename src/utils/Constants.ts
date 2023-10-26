export class Constants {

	static readonly X_SESSION_ID = "x-govuk-signin-session-id";

	static readonly SESSION_ID = "session-id";

	static readonly ACCESSTOKEN_LOGGER_SVC_NAME = "AccessTokenHandler";

	static readonly AUTHORIZATIONCODE_LOGGER_SVC_NAME = "AuthorizationCodeHandler";

	static readonly DOCUMENT_SELECTION_LOGGER_SVC_NAME = "DocumentSelectionHandler";

	static readonly ABORT_LOGGER_SVC_NAME = "AbortHandler";

	static readonly USERINFO_LOGGER_SVC_NAME = "UserInfoHandler";

	static readonly SESSIONCONFIG_LOGGER_SVC_NAME = "SessionConfigHandler";

	static readonly YOTI_CALLBACK_SVC_NAME = "YotiCallbackHandler";

	static readonly TRIGGER_YOTI_STATE_MACHINE_SVC_NAME = "TriggerYotiCallbackStateMachineHandler";

	static readonly F2F_METRICS_NAMESPACE = "F2F-CRI";

	static readonly JWKS_LOGGER_SVC_NAME = "JwksHandler";

	static readonly SESSION_LOGGER_SVC_NAME : "SessionHandler";

	static readonly REMINDER_EMAIL_LOGGER_SVC_NAME : "ReminderEmail";

	static readonly DEBUG = "DEBUG";

	static readonly INFO = "INFO";

	static readonly WARN = "WARN";

	static readonly ERROR = "ERROR";

	static readonly BEARER = "Bearer";

	static readonly CODE = "code";

	static readonly REDIRECT_URL = "redirect_uri";

	static readonly GRANT_TYPE = "grant_type";

	static readonly AUTHORIZATION_CODE = "authorization_code";

	static readonly AUTHORIZATION_CODE_INDEX_NAME = "authCode-updated-index";

	static readonly YOTI_SESSION_ID_INDEX_NAME = "yotiSessionId-index";

	static readonly AUTH_SESSION_STATE_INDEX_NAME = "authSessionState-updated-index";

	static readonly TOKEN_EXPIRY_SECONDS = 3600;

	static readonly REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	static readonly GOV_NOTIFY = "GOV_NOTIFY";

	static readonly ENV_VAR_UNDEFINED = "ENV Variables are undefined";

	static readonly PDF_EMAIL = "PDF_EMAIL";

	static readonly REMINDER_EMAIL = "REMINDER_EMAIL";
	
	static readonly REMINDER_EMAIL_DYNAMIC = "REMINDER_EMAIL_DYNAMIC";

	static readonly EMAIL_DISABLED = "EMAIL_DISABLED";

	static readonly EMAIL_METRICS_SVC_NAME = "SendEmailHandler";

	static readonly EMAIL_LOGGER_SVC_NAME = "SendEmailHandler";

	static readonly EMAIL_METRICS_NAMESPACE = "F2F-CRI";

	static readonly W3_BASE_CONTEXT = "https://www.w3.org/2018/credentials/v1";

  static readonly DI_CONTEXT = "https://vocab.account.gov.uk/contexts/identity-v1.jsonld";

  static readonly VERIFIABLE_CREDENTIAL = "VerifiableCredential";

  static readonly IDENTITY_CHECK_CREDENTIAL = "IdentityCheckCredential";

  static readonly URN_UUID_PREFIX = "urn:uuid:";

	static readonly FIRST_NAME = "first name";

	static readonly GOV_NOTIFY_OPTIONS = {
		FIRST_NAME: "first name",
		LAST_NAME: "last name",
		LINK_TO_FILE: "link_to_file",
		CHOSEN_PHOTO_ID: "chosen photo ID",
	};

	static readonly TXMA_FIELDS_TO_SHOW = ["event_name", "documentType"];
  
}
