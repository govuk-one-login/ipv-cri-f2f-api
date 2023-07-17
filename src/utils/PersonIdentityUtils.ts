import { PersonIdentityItem } from "../models/PersonIdentityItem";
import { YOTI_DOCUMENT_COUNTRY_CODE, YOTI_ADDRESS_FORMAT_CODE } from "./YotiPayloadEnums";

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

	getYotiStructuredPostalAddress(personDetails: PersonIdentityItem) : { address_format: number; building_number: string; address_line1: string; town_city: string; postal_code: string; country_iso: string; country: string } {
		const address = personDetails.addresses[0];

		return {
  		address_format: YOTI_ADDRESS_FORMAT_CODE,
  		building_number: address.buildingNumber,
  		address_line1: `${address.buildingNumber} ${address.buildingName ? `${address.buildingName} ` : ""}${address.streetName}`.trim(),
  		town_city: address.addressLocality,
  		postal_code: address.postalCode,
  		country_iso: YOTI_DOCUMENT_COUNTRY_CODE,
  		country: address.addressCountry,
  	};
	},
};
