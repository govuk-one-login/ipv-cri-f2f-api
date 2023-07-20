import { ResidencePermit, IdentityCard, DrivingPermit, Passport, VerifiedCredentialEvidence, VerifiedCredentialSubject } from "./IVeriCredential";
import { ISessionItem } from "../models/ISessionItem";
import { absoluteTimeNow } from "./DateTimeUtils";
import { PostOfficeInfo } from "../models/YotiPayloads";

export type TxmaEventName =
	"F2F_CRI_START"
	| "F2F_CRI_AUTH_CODE_ISSUED"
	| "F2F_YOTI_PDF_EMAILED"
	| "F2F_YOTI_START"
	| "F2F_YOTI_RESPONSE_RECEIVED"
	| "F2F_CRI_VC_ISSUED"
	| "F2F_CRI_END";


export interface TxmaUser {
	"user_id": string;
	"transaction_id"?: string;
	"persistent_session_id": string;
	"session_id": string;
	"govuk_signin_journey_id": string;
	"ip_address"?: string | undefined;
	"email"?: string;
}

export interface BaseTxmaEvent {
	"user": TxmaUser;
	"client_id": string;
	"timestamp": number;
	"component_id": string;
}

export interface RestrictedObject {
	"user"?: VerifiedCredentialSubject;
	"documentType"?: string;
	"issuingCountry"?: string;
	"passport"?: Passport;
	"drivingPermit"?: DrivingPermit;
	"residencePermit"?: ResidencePermit;
	"idCard"?: IdentityCard;
}

export interface ExtensionObject {
	"evidence"?: VerifiedCredentialEvidence;
	"post_office_details"?: PostOfficeInfo;
}

export interface TxmaEvent extends BaseTxmaEvent {
	"event_name": TxmaEventName;
	"restricted"?: RestrictedObject;
	"extensions"?: ExtensionObject;
}

export const buildCoreEventFields = (session: ISessionItem, issuer: string, sourceIp?: string | undefined, getNow: () => number = absoluteTimeNow, yotiSessionId?: string): BaseTxmaEvent => {
	return {
		user: {
			user_id: session.subject,
			persistent_session_id: session.persistentSessionId,
			session_id: session.sessionId,
			govuk_signin_journey_id: session.clientSessionId,
			ip_address: sourceIp,
		},
		client_id: session.clientId,
		timestamp: getNow(),
		component_id: issuer,
	};
};
