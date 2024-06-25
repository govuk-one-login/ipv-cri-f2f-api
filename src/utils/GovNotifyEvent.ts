import { PersonIdentityAddress, PersonIdentityItem } from "../models/PersonIdentityItem";
import { Constants } from "./Constants";
import { personIdentityUtils } from "./PersonIdentityUtils";
import { PdfPreferenceEnum } from "./PdfPreferenceEnum";

export interface GovNotifyEvent {
	"Message": {
		"sessionId": string;
		"yotiSessionId": string;
		"emailAddress": string;
		"firstName": string;
		"lastName": string;
		"messageType": string;
		"pdfPreference"?: string;
		"postalAddress"?: PersonIdentityAddress;
	};
}

export interface ReminderEmailEvent {
	"Message": {
		"emailAddress": string;
		"messageType": string;
	};
}
export interface ReminderEmailEventDynamic {
	"Message": {
		"firstName": string;
		"lastName": string;
		"documentUsed": string;
		"emailAddress": string;
		"messageType": string;
	};
}


export const buildGovNotifyEventFields = (sessionId: string, yotiSessionId: string, personDetails: PersonIdentityItem): GovNotifyEvent => {
	const nameParts = personIdentityUtils.getNames(personDetails);
	if (personDetails.pdfPreference === PdfPreferenceEnum.PRINTED_LETTER) {
		const addressesLength = personDetails.addresses.length;
		return {
			Message : {
				sessionId,
				yotiSessionId,
				emailAddress: personIdentityUtils.getEmailAddress(personDetails),
				firstName: nameParts.givenNames[0],
				lastName: nameParts.familyNames[0],
				messageType: Constants.PDF_EMAIL,
				pdfPreference: personDetails.pdfPreference,
				postalAddress: {
					uprn: personDetails.addresses[addressesLength - 1].uprn,
					organisationName: personDetails.addresses[addressesLength - 1].organisationName,
					departmentName: personDetails.addresses[addressesLength - 1].departmentName,
					subBuildingName: personDetails.addresses[addressesLength - 1].subBuildingName,
					buildingNumber: personDetails.addresses[addressesLength - 1].buildingNumber,
					buildingName: personDetails.addresses[addressesLength - 1].buildingName,
					dependentStreetName: personDetails.addresses[addressesLength - 1].dependentStreetName,
					streetName: personDetails.addresses[addressesLength - 1].streetName,
					doubleDependentAddressLocality: personDetails.addresses[addressesLength - 1].doubleDependentAddressLocality,
					dependentAddressLocality: personDetails.addresses[addressesLength - 1].dependentAddressLocality,
					addressLocality: personDetails.addresses[addressesLength - 1].addressLocality,
					postalCode: personDetails.addresses[addressesLength - 1].postalCode,
					addressCountry: personDetails.addresses[addressesLength - 1].addressCountry,
					validFrom: personDetails.addresses[addressesLength - 1].validFrom,
					validUntil: personDetails.addresses[addressesLength - 1].validUntil,
					preferredAddress: true,
				},
			},
		};
	} else {
		return {
			Message : {
				sessionId,
				yotiSessionId,
				emailAddress: personIdentityUtils.getEmailAddress(personDetails),
				firstName: nameParts.givenNames[0],
				lastName: nameParts.familyNames[0],
				messageType: Constants.PDF_EMAIL,
				pdfPreference: personDetails.pdfPreference,
			},
		};
	}
};

export const buildReminderEmailEventFields = (emailAddress: string): ReminderEmailEvent => {

	return {
		Message : {
			emailAddress,
			messageType: Constants.REMINDER_EMAIL,
		},
	};
};

export const buildDynamicReminderEmailEventFields = (
	emailAddress: string,
	firstName: string,
	lastName: string,
	documentUsed: string,
): ReminderEmailEventDynamic => {

	return {
		Message : {
			emailAddress,
			firstName,
			lastName,
			documentUsed,
			messageType: Constants.REMINDER_EMAIL_DYNAMIC,
		},
	};
};
