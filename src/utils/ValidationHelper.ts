import { validateOrReject } from "class-validator";
import { AppError } from "./AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { ISessionItem } from "../models/ISessionItem";
import { KmsJwtAdapter } from "./KmsJwtAdapter";
import { APIGatewayProxyEvent } from "aws-lambda";
import { absoluteTimeNow } from "./DateTimeUtils";
import { Constants } from "./Constants";

export class ValidationHelper {

	async validateModel(model: object, logger: Logger): Promise<void> {
		try {
			await validateOrReject(model, { forbidUnknownValues: true });
		} catch (errors) {
			const errorDetails = this.getErrors(errors);
			console.log(`${model.constructor.name}`);
			console.log("**** Error validating " + `${model.constructor.name}` + "   " + JSON.stringify(errorDetails));
			console.log(`Failed to validate data - ${model.constructor.name}`, "ValidationHelper", HttpCodesEnum.UNPROCESSABLE_ENTITY, errorDetails);
			throw new AppError(`Failed to Validate - ${model.constructor.name}` + errorDetails, HttpCodesEnum.UNPROCESSABLE_ENTITY);
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

	private validateUserData(data: string | undefined, errmsg: string, logger: Logger): boolean {
		let isValid = true;
		if (data == null || data === undefined || data.trim().length === 0) {
			logger.info({ message :"UserInfo missing: ", errmsg });
			isValid = false;
		}
		return isValid;
	}

	validateUserInfo(session: ISessionItem, logger: Logger): boolean {
		let isValid = true;
		if (!this.validateUserData(session.full_name, "Full Name is missing", logger) ||
			!this.validateUserData(session.date_of_birth, "Date of Birth is missing", logger) ||
			!this.validateUserData(session.document_selected, "Document selection type is missing", logger) ||
			!this.validateUserData(session.date_of_expiry, "Expiry Date is missing", logger)) {
			isValid = false;
		}
		return isValid;
	}

	async eventToSubjectIdentifier(jwtAdapter: KmsJwtAdapter, event: APIGatewayProxyEvent): Promise<string> {
		const headerValue = event.headers.authorization ?? event.headers.Authorization;
		if (headerValue === null || headerValue === undefined) {
			throw new AppError( "Missing header: Authorization header value is missing or invalid auth_scheme", HttpCodesEnum.UNAUTHORIZED);
		}
		const authHeader = event.headers.Authorization as string;
		if (authHeader !== null && !authHeader.includes(Constants.BEARER)) {
			throw new AppError( "Missing header: Authorization header is not of Bearer type access_token", HttpCodesEnum.UNAUTHORIZED);

		}
		const token = headerValue.replace(/^Bearer\s+/, "");
		let isValidJwt = false;
		try {
			isValidJwt = await jwtAdapter.verify(token);
		} catch (err) {
			throw new AppError( "Failed to verify signature", HttpCodesEnum.UNAUTHORIZED);
		}

		if (!isValidJwt) {
			throw new AppError("Verification of JWT failed", HttpCodesEnum.UNAUTHORIZED);
		}

		const jwt = jwtAdapter.decode(token);

		if (jwt?.payload?.exp == null || jwt.payload.exp < absoluteTimeNow()) {
			throw new AppError("Verification of exp failed", HttpCodesEnum.UNAUTHORIZED);
		}

		if (jwt?.payload?.sub == null) {
			throw new AppError( "sub missing", HttpCodesEnum.UNAUTHORIZED);
		}

		return jwt.payload.sub;
	}

	isValidUUID(code: string): boolean {
		return Constants.REGEX_UUID.test(code);
	}

}
