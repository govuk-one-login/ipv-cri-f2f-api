import { IdentityCard, DrivingPermit, Passport, VerifiedCredentialSubject } from "./IVeriCredential";
import { ISessionItem } from "../models/ISessionItem";

export type TxmaEventName =
	"F2F_CRI_START"
	| "F2F_CRI_AUTH_CODE_ISSUED"
	| "F2F_YOTI_PDF_EMAILED"
	| "F2F_YOTI_PDF_LETTER_POSTED"
	| "F2F_YOTI_START"
	| "F2F_YOTI_RESPONSE_RECEIVED"
	| "F2F_CRI_VC_ISSUED"
	| "F2F_CRI_END"
	| "F2F_DOCUMENT_UPLOADED"
	| "F2F_CRI_SESSION_ABORTED";


export interface TxmaUser {
	"user_id": string;
	"persistent_session_id": string;
	"session_id": string;
	"govuk_signin_journey_id"?: string;
	"ip_address"?: string | undefined;
	"email"?: string;
}

export interface BaseTxmaEvent {
	"user": TxmaUser;
	"timestamp": number;
	"event_timestamp_ms": number;
	"component_id": string;
}

export interface RestrictedObject {
	"user"?: VerifiedCredentialSubject;
	"name"?: object[];
	"birthDate"?: object[];
	"documentType"?: string;
	"issuingCountry"?: string;
	"passport"?: Passport;
	"drivingPermit"?: DrivingPermit;
	"idCard"?: IdentityCard;
	"postalAddress"?: object;
	device_information?: {
		encoded: string;
	};
}

export type CiReason = {
	ci: string;
	reason: string;
};

export type VerifiedCredentialEvidenceTxMA = Array<{
	type?: string;
	txn: string;
	strengthScore?: number;
	validityScore?: number;
	verificationScore?: number;
	checkDetails?: Array<{
		photoVerificationProcessLevel?: number;
		checkMethod: string;
		identityCheckPolicy?: string;
		activityFrom?: string;
		biometricVerificationProcessLevel?: number;
	}>;
	ci?: string[];
	ciReasons?: [CiReason];
	failedCheckDetails?: Array<{
		photoVerificationProcessLevel?: number;
		checkMethod: string;
		identityCheckPolicy?: string;
		biometricVerificationProcessLevel?: number;
	}>;
}>;

export interface ExtensionObject {
	"evidence"?: VerifiedCredentialEvidenceTxMA;
	"previous_govuk_signin_journey_id"?: string;
	"post_office_details"?: PostOfficeDetails;
	"post_office_visit_details"?: PostOfficeVisitDetails;
}

export interface TxmaEvent extends BaseTxmaEvent {
	"event_name": TxmaEventName;
	"restricted"?: RestrictedObject;
	"extensions"?: ExtensionObject;
}

export const buildCoreEventFields = (
	session: ISessionItem,
	issuer: string,
	sourceIp?: string | undefined,
): BaseTxmaEvent => {
	const now = Date.now();

	return {
		user: {
			user_id: session.subject,
			persistent_session_id: session.persistentSessionId,
			session_id: session.sessionId,
			ip_address: sourceIp,
		},
		timestamp: Math.floor(now / 1000),
		event_timestamp_ms: now,
		component_id: issuer,
	};
};

export type PostOfficeDetails = Array<{
	name?: string;
	address: string;
	post_code: string;
	location: Array<{
		latitude: number;
		longitude: number;
	}>;
}>;

export type PostOfficeVisitDetails = Array<{
	"post_office_date_of_visit": string;
	"post_office_time_of_visit": string;
}>;
