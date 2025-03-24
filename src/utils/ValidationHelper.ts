import { validateOrReject } from "class-validator";
import { AppError } from "./AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { KmsJwtAdapter } from "./KmsJwtAdapter";
import { APIGatewayProxyEvent } from "aws-lambda";
import { absoluteTimeNow } from "./DateTimeUtils";
import { Constants } from "./Constants";
import { JwtPayload } from "./IVeriCredential";
import { PersonIdentityAddress, PersonIdentityName } from "../models/PersonIdentityItem";
import { MessageCodes } from "../models/enums/MessageCodes";

export class ValidationHelper {

	async validateModel(model: object, logger: Logger): Promise<void> {
		try {
			await validateOrReject(model, { forbidUnknownValues: true });
		} catch (errors) {
			const errorDetails = this.getErrors(errors);
			logger.error({ message: `Error validating ${model.constructor.name}`, errorDetails });
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
		if (!headerValue.includes(Constants.BEARER + " ")) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing header: Authorization header is not of Bearer type access_token");

		}
		const token = headerValue.replace(/^Bearer\s+/, "");

		let isValidJwt = false;
		try {
			isValidJwt = await jwtAdapter.verify(token);
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
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

	isPersonDetailsValid(personEmail: string, personName: PersonIdentityName[]): { errorMessage: string; errorMessageCode: string } {
		// Validate user details like givenName, familyName and email
		if (!this.checkIfValidString([personEmail])) {
			return {
				errorMessage: "Missing emailAddress",
				errorMessageCode: MessageCodes.MISSING_PERSON_EMAIL_ADDRESS,
			};
		} else if (!personName || !this.isPersonNameValid(personName)) {
			return {
				errorMessage: "Missing person's GivenName or FamilyName",
				errorMessageCode: MessageCodes.MISSING_PERSON_IDENTITY_NAME,
			};
		}
		return {
			errorMessage: "",
			errorMessageCode: "",
		};		
	}

	isPersonNameValid(personName: PersonIdentityName[]) : boolean {		
		let isValid = true;

		if ( personName.length === 0 ) {
			isValid = false;
		} else {
			for (const name of personName) {
				const { nameParts } = name;
				const givenNames: string[] = [];
				const familyNames: string[] = [];
				if (nameParts.length === 0 ) {
					isValid = false;
				} else {
					for (const namePart of nameParts) {
						if (namePart.type === "GivenName" && this.checkIfValidString([namePart.value])) {
							givenNames.push(namePart.value);
						}
						if (namePart.type === "FamilyName" && this.checkIfValidString([namePart.value])) {
							familyNames.push(namePart.value);
						}			
					}
					if ( givenNames.length === 0 || familyNames.length === 0 ) {
						isValid = false;
						break;
					}
				}
			}
		}
		return isValid;
	}

	isAddressFormatValid(jwtPayload: JwtPayload): { errorMessage: string; errorMessageCode: string } {		
		// Validate user Address fields and Return error if address is missing or missing mandatory fields.
		if (!jwtPayload.shared_claims.address || jwtPayload.shared_claims.address.length === 0) {			
			return {
				errorMessage: "Missing Address from shared claims data",
				errorMessageCode: MessageCodes.MISSING_POSTAL_ADDRESS,
			};
		} else {
			const personIdentityAddresses: PersonIdentityAddress[] = jwtPayload.shared_claims.address;
			for (const address of personIdentityAddresses) {
				if (!this.checkIfValidCountryCode(address.addressCountry)) {
					return {
						errorMessage: "Invalid country code: country code is not GB in the postalAddress",
						errorMessageCode: MessageCodes.INVALID_COUNTRY_CODE,
					};
				} else if (!this.checkIfAddressIsValid(address)) {
					// Validation fails if all the mandatory postalAddress fields- subBuildingName, buildingName, buildingNumber and streetName are missing and is not a valid string or if all the 3 mandatory fields- subBuildingName, buildingName, buildingNumber are missing or not a valid string
					return {
						errorMessage: "Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session",
						errorMessageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS,
					};
				}
			}
			return {
				errorMessage: "",
				errorMessageCode: "",
			};
		}
	}

	// If >1 addresses in shared_claims, address{}.validUntil will not be present on the preferredAddress
	getPreferredAddress(sharedClaimsAddress: PersonIdentityAddress[]): PersonIdentityAddress | undefined {
		if (sharedClaimsAddress.length > 1) {
		  // Find the address object that does not have the 'validUntil' property
		  return sharedClaimsAddress.find((addr) => !addr.validUntil);
		} else if (sharedClaimsAddress.length === 1) {
		  return sharedClaimsAddress[0];
		}
	}

	/**
	 * Checks if the countryCode is 'GB'.
	 *
	 * @param countryCode
	 */
	checkIfValidCountryCode(countryCode: string): boolean {
		if (countryCode !== "GB") {
			return false;
		}
		return true;
	}

	/**
	 * Validation fails if all the mandatory postalAddress fields- subBuildingName, buildingName, buildingNumber and streetName are missing and is not a valid string or if all the 3 mandatory fields- subBuildingName, buildingName, buildingNumber are missing or not a valid string
	 *
	 *
	 * @param address
	 */
	checkIfAddressIsValid(address: PersonIdentityAddress): boolean {
		if ((!this.checkIfValidString([address.subBuildingName, address.buildingName, address.buildingNumber, address.streetName])) ||
			(!this.checkIfValidString([address.subBuildingName, address.buildingName, address.buildingNumber]))) {
			return false;
		}
		return true;
	}

	/**
	 * Returns true if any string in the array is defined and does not
	 * contain spaces only
	 *
	 * @param params
	 */
	checkIfValidString(params: Array<string | undefined>): boolean {
		if (params.some((param) => (param && param.trim()) )) {
			return true;
		}
		return false;
	}

	checkRequiredYotiVars(): boolean {
		const requiredVars = ["YOTISDK", "YOTI_SESSION_TTL_DAYS", "RESOURCES_TTL_SECS"];
		const missingVars = requiredVars.filter(varName => !process.env[varName]);
		if (missingVars.length > 0) {
			return false;
		}
		return true;
	}

}
