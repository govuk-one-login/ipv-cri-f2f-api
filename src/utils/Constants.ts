export class Constants {

    static readonly X_SESSION_ID = "x-govuk-signin-session-id";

    static readonly SESSION_ID = "session-id";

    static readonly CLAIMEDID_METRICS_SVC_NAME = "ClaimedIdentity";

    static readonly CLAIMEDID_LOGGER_SVC_NAME = "ClaimedIdHandler";

    static readonly CLAIMEDID_METRICS_NAMESPACE = "CIC-CRI";

    static readonly USERINFO_LOGGER_SVC_NAME = "UserInfoHandler";

    static readonly ACCESSTOKEN_LOGGER_SVC_NAME = "AccessTokenHandler";

    static readonly JWKS_LOGGER_SVC_NAME = "JwksHandler";

    static readonly DEBUG = "DEBUG";

    static readonly INFO = "INFO";

    static readonly WARN = "WARN";

    static readonly ERROR = "ERROR";

    static readonly BEARER = "Bearer";

    static readonly W3_BASE_CONTEXT = "https://www.w3.org/2018/credentials/v1";

    static readonly DI_CONTEXT = "https://vocab.london.cloudapps.digital/contexts/identity-v1.jsonld";

    static readonly CLAIMED_IDENTITY_CREDENTIAL_TYPE = "ClaimedIdentityCredential";

    static readonly VERIFIABLE_CREDENTIAL = "VerifiableCredential";

    static readonly CODE = "code";

    static readonly REDIRECT_URL = "redirect_uri";

    static readonly GRANT_TYPE = "grant_type";

    static readonly AUTHORIZATION_CODE = "authorization_code";

    static readonly AUTHORIZATION_CODE_INDEX_NAME = "authorizationCode-index";

    static readonly TOKEN_EXPIRY_SECONDS = 3600;

    static readonly CREDENTIAL_EXPIRY = 15638400;

    static readonly REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
}
