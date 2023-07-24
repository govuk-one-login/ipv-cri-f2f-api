import { PersonIdentityAddress, PersonIdentityItem } from "../models/PersonIdentityItem";
import { YOTI_DOCUMENT_COUNTRY, YOTI_DOCUMENT_COUNTRY_CODE, YOTI_ADDRESS_FORMAT_CODE } from "./YotiPayloadEnums";
import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AppError } from "./AppError";
import { HttpCodesEnum } from "./HttpCodesEnum";

export const personIdentityUtils = {

	getNames(personDetails: PersonIdentityItem) : { givenNames: string[]; familyNames: string[] } {
		const givenNames: string[] = [];
  	const familyNames: string[] = [];

  	for (const name of personDetails.name) {
  		const { nameParts } = name;
  		for (const namePart of nameParts) {
  			if (namePart.type === "GivenName") {
  				givenNames.push(namePart.value);
  			}
  			if (namePart.type === "FamilyName") {
  				familyNames.push(namePart.value);
  			}
  		}
  	}

		return { givenNames, familyNames };
	},

	getEmailAddress(personDetails: PersonIdentityItem): string {
		return personDetails.emailAddress;
	},

	getYotiStructuredPostalAddress(address: PersonIdentityAddress, logger: Logger) : { address_format: number; building_number: string; sub_building: string; building: string; address_line1: string; address_line2: string; town_city: string; postal_code: string; country_iso: string; country: string } {

		try {
			const { addressLine1, addressLine2 } = this.getYotiAddressLines(address, logger);
			return {
				address_format: YOTI_ADDRESS_FORMAT_CODE,
				building_number: address.buildingNumber ? address.buildingNumber.trim() : "",
				sub_building: address.subBuildingName ? address.subBuildingName.trim() : "",
				building: address.buildingName ? address.buildingName.trim() : "",
				address_line1: addressLine1,
				address_line2: addressLine2,
				town_city: address.addressLocality,
				postal_code: address.postalCode,
				country_iso: YOTI_DOCUMENT_COUNTRY_CODE,
				country: YOTI_DOCUMENT_COUNTRY,
			};
		} catch (error: any) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, error.message);
		}

	},

	getYotiAddressLines(address: PersonIdentityAddress, logger: Logger) : { addressLine1: string; addressLine2: string } {
		let addressLine1, addressLine2;
		if ((!this.checkIfValidString([address.subBuildingName]) &&
			!this.checkIfValidString([address.buildingName]) &&
			!this.checkIfValidString([address.buildingNumber]) &&
			!this.checkIfValidString([ address.streetName])) ||
			(!this.checkIfValidString([address.subBuildingName]) &&
				!this.checkIfValidString([address.buildingName]) &&
				!this.checkIfValidString([address.buildingNumber]))) {
			// Throw an error if all the mandatory postalAddress fields- subBuildingName, buildingName, buildingNumber and streetName exists and is a valid string or atleast one of subBuildingName, buildingName, buildingNumber is a valid string
			logger.error({ message: "Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session" }, { messageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS });
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing all mandatory postalAddress fields, unable to create the session");
		} else if ( !this.checkIfValidString([address.subBuildingName]) && !this.checkIfValidString([address.buildingName])) {
			// Log a warning message if subBuildingName and buildingName is absent and hence setting the addressLine1 with buildingNumber and StreetName and setting the addressLine2 to an empty string.
			logger.warn({ message: "subBuildingName and buildingName is empty for this postalAddress" }, { messageCode: MessageCodes.MISSING_SUB_BUILDING_AND_BUILDING_NAME });
			addressLine1 = `${address.buildingNumber} ${address.streetName}`.trim();
			addressLine2 = "";
		} else {
			addressLine1 = `${address.subBuildingName ? `${address.subBuildingName}` : ""} ${address.buildingName ? `${address.buildingName} ` : ""}`.trim();
			addressLine2 = `${address.buildingNumber} ${address.streetName}`.trim();
		}
		return {
			addressLine1, addressLine2,
		};

	},

	/**
	 * Checks if all string values in the array are defined and does not
	 * contain spaces only
	 *
	 * @param params
	 */
	checkIfValidString(params: Array<string | undefined>): boolean {
		if (params.some((param) => (!param || !param.trim()) )) {
			return false;
		}
		return true;
	},
};
