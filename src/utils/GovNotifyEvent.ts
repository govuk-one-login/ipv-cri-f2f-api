import { PersonIdentity } from "../models/PersonIdentity";
import { personIdentityUtils } from "./PersonIdentityUtils";

export interface BaseGovNotifyEvent {
	"Message": {
		"sessionId": string;
		"yotiSessionId": string;
		"emailAddress": string;
		"firstName": string;
		"lastName": string;
		"messageType": string;
	};
}

export interface GovNotifyEvent {
	"Message": {
		"sessionId": string;
		"yotiSessionId": string;
		"emailAddress": string;
		"firstName": string;
		"lastName": string;
		"messageType": string;
	};
}

export const buildGovNotifyEventFields = (sessionId: string, yotiSessionId: string, personDetails: PersonIdentity): GovNotifyEvent => {
	const nameParts = personIdentityUtils.getNames(personDetails);

	return {
		Message : {
			sessionId,
			yotiSessionId,
			emailAddress: personIdentityUtils.getEmailAddress(personDetails),
			firstName: nameParts.givenNames[0],
			lastName: nameParts.familyNames[0],
			messageType: "email",
		},
	};
};
