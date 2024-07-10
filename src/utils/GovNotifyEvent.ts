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
		const postalAddress = personDetails.addresses.filter((address) => address.preferredAddress === true);
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
					uprn: postalAddress[0].uprn,
					organisationName: postalAddress[0].organisationName,
					departmentName: postalAddress[0].departmentName,
					subBuildingName: postalAddress[0].subBuildingName,
					buildingNumber: postalAddress[0].buildingNumber,
					buildingName: postalAddress[0].buildingName,
					dependentStreetName: postalAddress[0].dependentStreetName,
					streetName: postalAddress[0].streetName,
					doubleDependentAddressLocality: postalAddress[0].doubleDependentAddressLocality,
					dependentAddressLocality: postalAddress[0].dependentAddressLocality,
					addressLocality: postalAddress[0].addressLocality,
					postalCode: postalAddress[0].postalCode,
					addressCountry: postalAddress[0].addressCountry,
					validFrom: postalAddress[0].validFrom,
					validUntil: postalAddress[0].validUntil,
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
