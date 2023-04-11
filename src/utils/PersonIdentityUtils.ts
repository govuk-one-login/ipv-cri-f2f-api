import { PersonIdentity } from "../models/PersonIdentity";

export const personIdentityUtils = {

	getNames(personDetails: PersonIdentity) {
		const givenNames: string[] = [];
  	const familyNames: string[] = [];

  	for (const name of personDetails.names) {
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

	getEmailAddress(personDetails: PersonIdentity): string {
		//TODO: Update email file to be fetched from Person Identity Table once Session work completed
		// return personDetails.emailAddress;
		return "bhavana.hemanth@digital.cabinet-office.gov.uk";
	},

	getYotiStructuredPostalAddress(personDetails: PersonIdentity) {
		//TODO: Hardcoded now, will update with values from Person Identity table once /session work completed
		return {
  		address_format: 1,
  		building_number: "74",
  		address_line1: "AddressLine1",
  		town_city: "CityName",
  		postal_code: "E143RN",
  		country_iso: "GBR",
  		country: "United Kingdom",
  	};
	},
};
