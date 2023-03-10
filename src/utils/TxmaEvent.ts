import { VerifiedCredential } from "./IVeriCredential";
import { ISessionItem } from "../models/ISessionItem";
import { absoluteTimeNow } from "./DateTimeUtils";

export type TxmaEventName =
	"CIC_CRI_START"
	| "CIC_CRI_AUTH_CODE_ISSUED"
	| "CIC_CRI_VC_ISSUED";

export interface TxmaUser {
	"user_id": string;
	"transaction_id": string;
	"persistent_session_id": string;
	"session_id": string;
	"govuk_signin_journey_id": string;
	"ip_address"?: string | undefined;
}

export interface BaseTxmaEvent {
	"user": TxmaUser;
	"client_id": string;
	"timestamp": number;
	"component_id": string;
}

export interface TxmaEvent extends BaseTxmaEvent {
	"event_name": TxmaEventName;
	"restricted"?: VerifiedCredential["credentialSubject"];
}

export const buildCoreEventFields = (session: ISessionItem, issuer: string, sourceIp?: string | undefined, getNow: () => number = absoluteTimeNow): BaseTxmaEvent => {
	return {
		user: {
			user_id: session.clientId,
			transaction_id: "",
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
