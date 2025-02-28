import { BirthDate, Address, Name } from "../../utils/IVeriCredential";

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
	pdf_preference: string;
	postal_address?: {

		uprn?: number;
		buildingNumber?: string;
		buildingName?: string;
		streetName?: string;
		addressLocality?: string;
		addressCountry?: string;
		preferredAddress?: boolean;
		subBuildingName?: string;

	};
}

export interface PostalAddress {
	addressCountry: string;
	preferredAddress: boolean;
	uprn: number;
	buildingName: string;
	streetName: string;
	postalCode: string;
	buildingNumber: string;
	addressLocality: string;
	subBuildingName: string;
}


export interface StubStartRequest {
	clientId?: string;
	yotiMockID?: string;
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
	pcl_enabled?: boolean;
	evidence_requested: {
		strengthScore: number;
	};
}
