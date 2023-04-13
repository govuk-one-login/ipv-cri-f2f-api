import { PersonIdentityItem } from "../models/PersonIdentityItem";

export const personIdentityUtils = {

	getNames(personDetails: PersonIdentityItem) {
		const givenNames: string[] = [];
  	const familyNames: string[] = [];

  	for (const name of personDetails.name) {
  		const nameParts = name.nameParts;
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

	getYotiStructuredPostalAddress(personDetails: PersonIdentityItem) {
		const address = personDetails.addresses[0];

		return {
  		address_format: 1,
  		building_number: address.buildingNumber,
  		address_line1: `${address.buildingName} ${address.streetName}`,
  		town_city: address.addressLocality,
  		postal_code: address.postalCode,
  		country_iso: "GBR",
  		country: address.addressCountry,
  	};
	},
};
