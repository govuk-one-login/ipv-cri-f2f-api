export class Constants {

	static readonly X_SESSION_ID = "x-govuk-signin-session-id";

	static readonly SESSION_ID = "session-id";

	static readonly F2F_METRICS_NAMESPACE = "F2F-CRI";

	static readonly BEARER = "Bearer";

	static readonly CODE = "code";

	static readonly REDIRECT_URL = "redirect_uri";

	static readonly GRANT_TYPE = "grant_type";

	static readonly AUTHORIZATION_CODE = "authorization_code";

	static readonly AUTHORIZATION_CODE_INDEX_NAME = "authCode-updated-index";

	static readonly YOTI_SESSION_ID_INDEX_NAME = "yotiSessionId-index";

	static readonly AUTH_SESSION_STATE_INDEX_NAME = "authSessionState-updated-index";

	static readonly EXPIRED_SESSIONS_INDEX_NAME = "expiredCheck-index";

	static readonly TOKEN_EXPIRY_SECONDS = 3600;

	static readonly REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	static readonly GOV_NOTIFY = "GOV_NOTIFY";

	static readonly ENV_VAR_UNDEFINED = "ENV Variables are undefined";

	static readonly PDF_EMAIL = "PDF_EMAIL";

	static readonly REMINDER_EMAIL = "REMINDER_EMAIL";
	
	static readonly REMINDER_EMAIL_DYNAMIC = "REMINDER_EMAIL_DYNAMIC";

	static readonly EMAIL_DISABLED = "EMAIL_DISABLED";

	static readonly EMAIL_METRICS_NAMESPACE = "F2F-CRI";

	static readonly W3_BASE_CONTEXT = "https://www.w3.org/2018/credentials/v1";

  	static readonly DI_CONTEXT = "https://vocab.account.gov.uk/contexts/identity-v1.jsonld";

  	static readonly VERIFIABLE_CREDENTIAL = "VerifiableCredential";

  	static readonly IDENTITY_CHECK_CREDENTIAL = "IdentityCheckCredential";

  	static readonly URN_UUID_PREFIX = "urn:uuid:";

	static readonly FIRST_NAME = "first name";
	
	static readonly PCL_PREFERENCE_EMAIL = "EMAIL";

	static readonly PCL_PREFERENCE_LETTER = "LETTER";

	static readonly GOV_NOTIFY_OPTIONS = {
		FIRST_NAME: "first name",
		LAST_NAME: "last name",
		DATE: "date",
		LINK_TO_FILE: "link_to_file",
		CHOSEN_PHOTO_ID: "chosen photo ID",
	};

	static readonly TXMA_FIELDS_TO_SHOW = ["event_name", "documentType", "session_id", "govuk_signin_journey_id"];

	static readonly X_FORWARDED_FOR = "x-forwarded-for";

	static readonly ENCODED_AUDIT_HEADER = "txma-audit-encoded";
	
	static readonly POSTCODE_HEADER = "postcode";
	
	static readonly CLIENT_ASSERTION = "client_assertion";

	static readonly CLIENT_ASSERTION_TYPE = "client_assertion_type";

	static readonly CLIENT_ASSERTION_TYPE_JWT_BEARER = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

	static readonly ENCRYPTION_KEY_ALIASES = [
        "session_decryption_key_active_alias",
        "session_decryption_key_previous_alias",
        "session_decryption_key_inactive_alias"
    ]
}
