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

interface IBVclientAssessments {
	type: string;
	state: string;
}

export interface SessionInfo {
	session_id: string;
	client_session_token_ttl: number;
	requested_checks: string[];
	applicant_profile: {
		media: {
			id: string;
			type: string;
			created: string;
			last_updated: string;
		};
	};
	capture: {
		required_resources: [
			{
				type: string;
				id: string;
				state: string;
				allowed_sources: [
					{
						type: string;
					},
				];
				requested_tasks: [];
				ibv_client_assessments: [IBVclientAssessments[]];
				supported_countries: [
					{
						code: string;
						supported_documents: [
							{
								type: string;
							},
						];
					},
				];
				allowed_capture_methods: string;
				attempts_remaining: {
					RECLASSIFICATION: number;
					GENERIC: number;
				};
			},
		];
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
