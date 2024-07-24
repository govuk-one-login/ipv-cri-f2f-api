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
		const postalAddress = personDetails.addresses.filter((address) => address.preferredAddress === true)[0];
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
					uprn: postalAddress.uprn,
					organisationName: postalAddress.organisationName,
					departmentName: postalAddress.departmentName,
					subBuildingName: postalAddress.subBuildingName,
					buildingNumber: postalAddress.buildingNumber,
					buildingName: postalAddress.buildingName,
					dependentStreetName: postalAddress.dependentStreetName,
					streetName: postalAddress.streetName,
					doubleDependentAddressLocality: postalAddress.doubleDependentAddressLocality,
					dependentAddressLocality: postalAddress.dependentAddressLocality,
					addressLocality: postalAddress.addressLocality,
					postalCode: postalAddress.postalCode,
					addressCountry: postalAddress.addressCountry,
					validFrom: postalAddress.validFrom,
					validUntil: postalAddress.validUntil,
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
