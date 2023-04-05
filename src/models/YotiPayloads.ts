export interface StructuredPostalAddress {
	address_format: number;
	building_number: string;
	address_line1: string;
	town_city: string;
	postal_code: string;
	country_iso: string;
	country: string;
}

export interface ApplicantProfile {
	full_name: string;
	date_of_birth: string;
	structured_postal_address: StructuredPostalAddress;
}

export interface PostOfficeInfo {
	address: string;
	post_code: string;
	location: {
		latitude: number;
		longitude: number;
	};
}

export interface CreateSessionPayload {
	client_session_token_ttl: string;
	resources_ttl: string;
	ibv_options: {
		support: string;
	};
	user_tracking_id: string;
	notifications: {
		endpoint: string;
		topics: string[];
		auth_token: string;
		auth_type: string;
	};
	requested_checks: Array<{
		type: string;
		config: {
			manual_check: string;
			scheme?: string;
		};
	}>;
	required_documents: Array<{
		type: string;
		filter: {
			type: string;
			inclusion: string;
			documents: Array<{
				country_codes: string[];
				document_types: string[];
			}>;
		};
	}>;
	resources: {
		applicant_profile: {
			full_name: string;
			date_of_birth: string;
			structured_postal_address: {
				address_format: number;
				building_number: string;
				address_line1: string;
				town_city: string;
				postal_code: string;
				country_iso: string;
				country: string;
			};
		};
	};	
}

export interface YotiSessionInfo {
	session_id: string;
	client_session_token_ttl: number;
	requested_checks: string[];
	applicant_profile: { media: {
		id: string;
		type: string;
		created: string;
		last_updated: string;
	}; };
	capture: {
		required_resources: Array<{
			type: string;
			id: string;
			state: string;
			allowed_sources: Array<{
				type: string;
			}>;
			requested_tasks: any[];
			ibv_client_assessments: Array<{
				type: string;
				state: string;
				scheme?: string;
			}>;
			supported_countries: Array<{
				code: string;
				supported_documents: Array<{
					type: string;
				}>;
			}>;
			allowed_capture_methods: string;
			attempts_remaining: {
				RECLASSIFICATION: number;
				GENERIC: number;
			};
		}>;
		biometric_consent: string;
	};
	sdk_config: {
		primary_colour: string;
		locale: string;
		hide_logo: boolean;
		allow_handoff: boolean;
	};	
	track_ip_address: boolean;
}
