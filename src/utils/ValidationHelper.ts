import { validateOrReject } from "class-validator";
import { AppError } from "./AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { KmsJwtAdapter } from "./KmsJwtAdapter";
import { APIGatewayProxyEvent } from "aws-lambda";
import { absoluteTimeNow } from "./DateTimeUtils";
import { Constants } from "./Constants";
import { JwtPayload } from "./IVeriCredential";

export class ValidationHelper {

	async validateModel(model: object, logger: Logger): Promise<void> {
		try {
			await validateOrReject(model, { forbidUnknownValues: true });
		} catch (errors) {
			const errorDetails = this.getErrors(errors);
			console.log(`${model.constructor.name}`);
			console.log("**** Error validating " + `${model.constructor.name}` + "   " + JSON.stringify(errorDetails));
			console.log(`Failed to validate data - ${model.constructor.name}`, "ValidationHelper", HttpCodesEnum.UNPROCESSABLE_ENTITY, errorDetails);
			throw new AppError(HttpCodesEnum.UNPROCESSABLE_ENTITY, `Failed to Validate - ${model.constructor.name} ${errorDetails}` );
		}
	}

	private getErrors(errors: any): any {
		return errors.map((error: any) => {
			return {
				property: error.property,
				value: error.value,
				constraints: error.constraints,
				children: error?.children, // Gets error messages from nested Objects
			};
		});
	}

	async eventToSubjectIdentifier(jwtAdapter: KmsJwtAdapter, event: APIGatewayProxyEvent): Promise<string> {
		const headerValue = event.headers.authorization ?? event.headers.Authorization;
		if (headerValue === null || headerValue === undefined) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing header: Authorization header value is missing or invalid auth_scheme");
		}
		const authHeader = event.headers.Authorization as string;
		if (authHeader !== null && !authHeader.includes(Constants.BEARER)) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing header: Authorization header is not of Bearer type access_token");

		}
		const token = headerValue.replace(/^Bearer\s+/, "");
		let isValidJwt = false;
		try {
			isValidJwt = await jwtAdapter.verify(token);
		} catch (err) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Failed to verify signature");
		}

		if (!isValidJwt) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Verification of JWT failed");
		}

		const jwt = jwtAdapter.decode(token);

		if (jwt?.payload?.exp == null || jwt.payload.exp < absoluteTimeNow()) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Verification of exp failed");
		}

		if (jwt?.payload?.sub == null) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "sub missing");
		}

		return jwt.payload.sub;
	}

	isValidUUID(code: string): boolean {
		return Constants.REGEX_UUID.test(code);
	}

	isJwtComplete = (payload: JwtPayload): boolean => {
		const clientId = payload.client_id;
		const responseType = payload.response_type;
		const journeyId = payload.govuk_signin_journey_id;
		const { iss, sub, aud, exp, nbf, state } = payload;
		const mandatoryJwtValues = [iss, sub, aud, exp, nbf, state, clientId, responseType, journeyId];
		return !mandatoryJwtValues.some((value) => value === undefined);
	};

	isJwtValid = (jwtPayload: JwtPayload,
		requestBodyClientId: string, expectedRedirectUri: string): string => {

		if (!this.isJwtComplete(jwtPayload)) {
			return "JWT validation/verification failed: Missing mandatory fields in JWT payload";
		} else if ((jwtPayload.exp == null) || (absoluteTimeNow() > jwtPayload.exp)) {
			return "JWT validation/verification failed: JWT expired";
		} else if (jwtPayload.nbf == null || (absoluteTimeNow() < jwtPayload.nbf)) {
			return "JWT validation/verification failed: JWT not yet valid";
		} else if (jwtPayload.client_id !== requestBodyClientId) {
			return `JWT validation/verification failed: Mismatched client_id in request body (${requestBodyClientId}) & jwt (${jwtPayload.client_id})`;
		} else if (jwtPayload.response_type !== "code") {
			return `JWT validation/verification failed: Unable to retrieve redirect URI for client_id: ${requestBodyClientId}`;
		} else if (expectedRedirectUri !== jwtPayload.redirect_uri) {
			return `JWT validation/verification failed: Redirect uri ${jwtPayload.redirect_uri} does not match configuration uri ${expectedRedirectUri}`;
		}

		return "";
	};

}
