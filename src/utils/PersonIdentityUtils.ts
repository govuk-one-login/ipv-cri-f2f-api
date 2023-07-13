import { PersonIdentityAddress, PersonIdentityItem } from "../models/PersonIdentityItem";
import { YOTI_DOCUMENT_COUNTRY_CODE, YOTI_ADDRESS_FORMAT_CODE } from "./YotiPayloadEnums";
import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../models/enums/MessageCodes";

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

	getYotiStructuredPostalAddress(personDetails: PersonIdentityItem, logger: Logger) : { address_format: number; building_number: string; sub_building: string; building: string; address_line1: string; address_line2: string; town_city: string; postal_code: string; country_iso: string; country: string } {
		const address = personDetails.addresses[0];

		const { addressLine1, addressLine2 } = this.getYotiAddressLines(address, logger);

		return {
			address_format: YOTI_ADDRESS_FORMAT_CODE,
			building_number: address.buildingNumber,
			sub_building: address.subBuildingName ? address.subBuildingName : "",
			building: address.buildingName,
			address_line1: addressLine1,
			address_line2: addressLine2,
			town_city: address.addressLocality,
			postal_code: address.postalCode,
			country_iso: YOTI_DOCUMENT_COUNTRY_CODE,
			country: address.addressCountry,
		};
	},

	getYotiAddressLines(address: PersonIdentityAddress, logger: Logger) : { addressLine1: string; addressLine2: string } {
		let addressLine1, addressLine2;
		if ( !address.subBuildingName && !address.buildingName ) {
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
