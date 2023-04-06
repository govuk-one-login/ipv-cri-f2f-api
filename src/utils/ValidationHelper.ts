import { validateOrReject } from "class-validator";
import { AppError } from "./AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "./HttpCodesEnum";
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
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Missing header: Authorization header value is missing or invalid auth_scheme");
		}
		const authHeader = event.headers.Authorization as string;
		if (authHeader !== null && !authHeader.includes(Constants.BEARER)) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Missing header: Authorization header is not of Bearer type access_token");

		}
		const token = headerValue.replace(/^Bearer\s+/, "");
		let isValidJwt = false;
		try {
			isValidJwt = await jwtAdapter.verify(token);
		} catch (err) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Failed to verify signature");
		}

		if (!isValidJwt) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Verification of JWT failed");
		}

		const jwt = jwtAdapter.decode(token);

		if (jwt?.payload?.exp == null || jwt.payload.exp < absoluteTimeNow()) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "Verification of exp failed");
		}

		if (jwt?.payload?.sub == null) {
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, "sub missing");
		}

		return jwt.payload.sub;
	}

	isValidUUID(code: string): boolean {
		return Constants.REGEX_UUID.test(code);
	}

}
