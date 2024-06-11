import { BirthDate, Address, Name } from "../../../utils/IVeriCredential";

export interface DocSelectionData {
	document_selection: {
		document_selected: string;
		date_of_expiry: string;
		country_code: string;
	};
	post_office_selection: {
		address: string;
		location: {
			latitude: number;
			longitude: number;
		};
	};
	post_code?: string;
	fad_code?: string;
}

export interface StubStartRequest {
	yotiMockID: string;
	shared_claims: {
		name: Name[];
		birthDate: BirthDate[];
		address: Address[];
		emailAddress: string;
	};
}

export interface StubStartResponse {
	clientId: string;
	request: string;
	sub: string;
}

export interface SessionResponse {
	session_id: string;
}

export interface AuthorizationResponse {
	authorizationCode: { value: string };
	redirect_uri: string;
	state: string;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: string;
}

export interface UserInfoResponse {
	sub: string;
	"https://vocab.account.gov.uk/v1/credentialStatus": string;
}

export interface SessionConfigResponse {
	evidence_requested: {
		strengthScore: number;
	};
}
