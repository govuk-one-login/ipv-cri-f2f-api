import { AccessRequestPayload } from "../type/AccessRequestPayload";
import { AppError } from "./AppError";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { Constants } from "./Constants";
import { ISessionItem } from "../models/ISessionItem";
import { ValidationHelper } from "./ValidationHelper";
import { AuthSessionState } from "../models/enums/AuthSessionState";

export class AccessTokenRequestValidationHelper {
    private readonly validationHelper: ValidationHelper;

    constructor() {
    	this.validationHelper = new ValidationHelper();
    }

    validatePayload(tokenRequestBody: string | null): AccessRequestPayload {
    	if (!tokenRequestBody) throw new AppError("Invalid request: missing body", HttpCodesEnum.UNAUTHORIZED);
    	// body is an application/x-www-form-urlencoded string
    	const searchParams = new URLSearchParams(tokenRequestBody);
    	const code = searchParams.get(Constants.CODE);
    	const redirectUri = searchParams.get(Constants.REDIRECT_URL);
    	const grant_type = searchParams.get(Constants.GRANT_TYPE);

    	if (!redirectUri) throw new AppError("Invalid request: Missing redirect_uri parameter", HttpCodesEnum.UNAUTHORIZED);
    	if (!code) throw new AppError("Invalid request: Missing code parameter", HttpCodesEnum.UNAUTHORIZED);

    	if (!grant_type || grant_type !== Constants.AUTHORIZATION_CODE) {
    		throw new AppError("Invalid grant_type parameter", HttpCodesEnum.UNAUTHORIZED);
    	}

    	if (!this.validationHelper.isValidUUID(code)) {
    		throw new AppError("AuthorizationCode must be a valid uuid", HttpCodesEnum.UNAUTHORIZED);
    	}

    	return { grant_type, code, redirectUri };
    }

    validateTokenRequestToRecord(sessionItem: ISessionItem, redirectUri: string) : void {
    	// Validate the redirectUri
    	const isValidRedirectUri = redirectUri.includes("/")
    		? redirectUri === sessionItem.redirectUri
    		: redirectUri === encodeURIComponent(sessionItem.redirectUri);

    	if (!isValidRedirectUri) {
    		throw new AppError(
    			`Invalid request: redirect uri ${redirectUri} does not match configuration uri ${sessionItem.redirectUri}`,
    			HttpCodesEnum.UNAUTHORIZED);
    	}
    	// Validate if the AuthSessionState is CIC_AUTH_CODE_ISSUED
    	if (sessionItem.authSessionState !== AuthSessionState.CIC_AUTH_CODE_ISSUED) {
    		throw new AppError( `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.CIC_AUTH_CODE_ISSUED}, actual state- ${sessionItem.authSessionState}`, HttpCodesEnum.UNAUTHORIZED);
    	}
    }
}
