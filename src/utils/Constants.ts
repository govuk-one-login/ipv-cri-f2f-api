export class Constants {

    static readonly X_SESSION_ID = "x-govuk-signin-session-id";

    static readonly SESSION_ID = "session-id";

    static readonly ACCESSTOKEN_LOGGER_SVC_NAME = "AccessTokenHandler";

    static readonly AUTHORIZATIONCODE_LOGGER_SVC_NAME = "AuthorizationCodeHandler";

    static readonly DOCUMENT_SELECTION_LOGGER_SVC_NAME = "DocumentSelectionHandler";

    static readonly F2F_METRICS_NAMESPACE = "F2F-CRI";

    static readonly JWKS_LOGGER_SVC_NAME = "JwksHandler";

    static readonly DEBUG = "DEBUG";

    static readonly INFO = "INFO";

    static readonly WARN = "WARN";

    static readonly ERROR = "ERROR";

    static readonly BEARER = "Bearer";

    static readonly W3_BASE_CONTEXT = "https://www.w3.org/2018/credentials/v1";

    static readonly DI_CONTEXT = "https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld";

    static readonly IDENTITY_ASSERTION_CREDENTIAL = "IdentityAssertionCredential";

    static readonly VERIFIABLE_CREDENTIAL = "VerifiableCredential";

    static readonly CODE = "code";

    static readonly REDIRECT_URL = "redirect_uri";

    static readonly GRANT_TYPE = "grant_type";

    static readonly AUTHORIZATION_CODE = "authorization_code";

    static readonly AUTHORIZATION_CODE_INDEX_NAME = "authorizationCode-index";

    static readonly TOKEN_EXPIRY_SECONDS = 3600;

    static readonly REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    static readonly GOV_NOTIFY = "GOV_NOTIFY";

    static readonly ENV_VAR_UNDEFINED = "ENV Variables are undefined";

    static readonly EMAIL_DISABLED = "EMAIL_DISABLED";

    static readonly EMAIL_METRICS_SVC_NAME = "SendEmailHandler";

    static readonly EMAIL_LOGGER_SVC_NAME = "SendEmailHandler";

    static readonly EMAIL_METRICS_NAMESPACE = "F2F-CRI";
}
