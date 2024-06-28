import { PersonIdentityAddress, PersonIdentityItem } from "../models/PersonIdentityItem";
import { YOTI_DOCUMENT_COUNTRY, YOTI_DOCUMENT_COUNTRY_CODE, YOTI_ADDRESS_FORMAT_CODE } from "./YotiPayloadEnums";
import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AppError } from "./AppError";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { Name } from "./IVeriCredential";
import { ValidationHelper } from "./ValidationHelper";

export const personIdentityUtils = {

	getNamesFromYoti(givenName: string, familyName: string): Name[] {
		const givenNames = givenName.split(/\s+/);
		const nameParts = givenNames.map((name) => ({ value: name, type: "GivenName" }));
		nameParts.push({ value: familyName, type: "FamilyName" });
		return [{ nameParts }];
	},

	getNamesFromPersonIdentity(personDetails: PersonIdentityItem, documentFields: any, logger: Logger): Name[] {
		const { full_name: yotiFullName } = documentFields;
		const { givenNames, familyNames } = this.getNames(personDetails);
		const f2fGivenNames = givenNames.join(" ");
		const f2fFamilyName = familyNames.join(" ");

		// Check if the fullName in f2f matches the fullName in DocumentFields
		const doesFullNameMatch = `${f2fGivenNames.toLowerCase()} ${f2fFamilyName.toLowerCase()}` === yotiFullName.toLowerCase();
		if (!doesFullNameMatch) {
			const errorMessage = "FullName mismatch between F2F & YOTI";
			logger.error({ message: errorMessage }, { messageCode: MessageCodes.VENDOR_SESSION_NAME_MISMATCH });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, errorMessage);
		}

		// Remove family name from the full name and split at spaces
		const yotiGivenNameParts = yotiFullName.replace(new RegExp(f2fFamilyName, "i"), "").match(/\S+/g);
		// Map the array of given names into the correct format
		const nameParts = yotiGivenNameParts.map((name: string) => ({ value: name.trim(), type: "GivenName" }));
		// Remove the given names from the full name, remove surrounding spaces, and map to correct format
		nameParts.push({ value: yotiFullName.replace(new RegExp(f2fGivenNames, "i"), "").trim(), type: "FamilyName" });

		return [{ nameParts }];
	},

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
			const { addressLine1, addressLine2 } = this.getAddressLines(address, logger);
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

	getStructuredPostalAddress(address: PersonIdentityAddress, logger: Logger) : { address_line1: string; address_line2: string; town_city: string; postal_code: string; } {

		try {
			const { addressLine1, addressLine2 } = this.getAddressLines(address, logger);
			return {
				address_line1: addressLine1,
				address_line2: addressLine2,
				town_city: address.addressLocality,
				postal_code: address.postalCode,
			};
		} catch (error: any) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, error.message);
		}

	},


	getAddressLines(address: PersonIdentityAddress, logger: Logger) : { addressLine1: string; addressLine2: string } {

		const validationHelper = new ValidationHelper();
		let addressLine1, addressLine2;
		if (!validationHelper.checkIfAddressIsValid(address)) {
			// Throw an error if all the mandatory postalAddress fields- subBuildingName, buildingName, buildingNumber and streetName exists and is a valid string or atleast one of subBuildingName, buildingName, buildingNumber is a valid string
			logger.error({ message: "Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session" }, { messageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS });
			// can we change this message
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing all mandatory postalAddress fields, unable to create the session");
		} else if ( !validationHelper.checkIfValidString([address.subBuildingName, address.buildingName])) {
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

};
