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
		if (!tokenRequestBody) throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid request: missing body");
		// body is an application/x-www-form-urlencoded string
		const searchParams = new URLSearchParams(tokenRequestBody);
		const code = searchParams.get(Constants.CODE);
		const redirectUri = searchParams.get(Constants.REDIRECT_URL);
		const grant_type = searchParams.get(Constants.GRANT_TYPE);
		const client_assertion_type = searchParams.get(Constants.CLIENT_ASSERTION_TYPE);
		const client_assertion = searchParams.get(Constants.CLIENT_ASSERTION);

		if (!redirectUri) throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid request: Missing redirect_uri parameter");
		if (!code) throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid request: Missing code parameter");

		if (!grant_type || grant_type !== Constants.AUTHORIZATION_CODE) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid grant_type parameter");
		}

		if (!this.validationHelper.isValidUUID(code)) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "AuthorizationCode must be a valid uuid");
		}

		if (!client_assertion_type || client_assertion_type !== Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid client_assertion_type parameter");
		}
	
		if (!client_assertion) throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Invalid request: Missing client_assertion parameter");
	
		return { grant_type, code, redirectUri, client_assertion_type, client_assertion };
	}

	validateTokenRequestToRecord(sessionItem: ISessionItem, redirectUri: string): void {
		// Validate the redirectUri
		const isValidRedirectUri = redirectUri.includes("/")
			? redirectUri === sessionItem.redirectUri
			: redirectUri === encodeURIComponent(sessionItem.redirectUri);

		if (!isValidRedirectUri) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED,
				`Invalid request: redirect uri ${redirectUri} does not match configuration uri ${sessionItem.redirectUri}`);
		}
		// Validate if the AuthSessionState is F2F_AUTH_CODE_ISSUED
		if (sessionItem.authSessionState !== AuthSessionState.F2F_AUTH_CODE_ISSUED) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state- ${sessionItem.authSessionState}`);
		}
	}
}
