import { EvidenceRequested } from "../utils/IVeriCredential";

export interface IF2fSession {
	given_names?: string[];
	family_names?: string[];
	date_of_birth?: string;
	document_selected?: string;
	date_of_expiry?: string;
}

export interface ISessionItem extends IF2fSession {
	sessionId: string;
	clientId: string;
	clientSessionId: string;
	authorizationCode?: string;
	authorizationCodeExpiryDate?: number;
	redirectUri: string;
	accessToken?: string;
	accessTokenExpiryDate?: number;
	expiryDate: number;
	createdDate: number;
	state: string;
	subject: string;
	persistentSessionId: string;
	clientIpAddress: string;
	attemptCount: number;
	authSessionState: string;
	yotiSessionId?: string;
	evidence_requested?: EvidenceRequested;
}

