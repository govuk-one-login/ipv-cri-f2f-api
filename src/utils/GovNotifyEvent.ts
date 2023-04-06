import { PersonIdentity } from "../models/PersonIdentity";
import { personIdentityUtils } from "./PersonIdentityUtils";

export type GovNotifyName =
	"F2F_CRI_INSTRUCTIONS_GENERATED";

export interface BaseGovNotifyEvent {
	"Message": {
		"sessionId": string;
		"yotiSessionId": string;
		"emailAddress": string;
		"firstName": string;
		"lastName": string;
		"messageType": string;
	}
}

export interface GovNotifyEvent extends BaseGovNotifyEvent {
	"event_name": string;
}

export const buildGovNotifyEventFields = (sessionId: string, yotiSessionId: string, personDetails: PersonIdentity): BaseGovNotifyEvent => {
	const nameParts = personIdentityUtils.getNames(personDetails);

	return {
		Message : {
			sessionId,
			yotiSessionId,
			emailAddress: personIdentityUtils.getEmailAddress(personDetails),
			firstName: nameParts.givenNames[0],
			lastName: nameParts.familyNames[0],
			messageType: "email",
		}
	};
};
