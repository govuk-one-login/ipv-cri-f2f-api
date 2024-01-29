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
	name?: string;
	address: string;
	post_code: string;
	location: {
		latitude: number;
		longitude: number;
	};
	fad_code: string;
}

export interface CreateSessionPayload {
	session_deadline: Date;
	resources_ttl: number;
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
	requested_tasks: Array<{
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
			allow_expired_documents?: boolean;
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

export interface YotiCompletedSession {
	client_session_token_ttl: number;
	session_id: string;
	state: string;
	resources: {
		id_documents: Array<{
			id: string;
			tasks: Array<{
				type: string;
				id: string;
				state: string;
				created: string;
				last_updated: string;
				generated_checks: any[];
				generated_media: Array<{
					id: string;
					type: string;
				}>;
			}>;
			source: {
				type: string;
			};
			created_at: string;
			last_updated: string;
			document_type: string;
			issuing_country: string;
			pages: Array<{
				capture_method: string;
				media: {
					id: string;
					type: string;
					created: string;
					last_updated: string;
				};
				frames: Array<{
					media: {
						id: string;
						type: string;
						created: string;
						last_updated: string;
					};
				}>;
			}>;
			document_fields?: {
				media: {
					id: string;
					type: string;
					created: string;
					last_updated: string;
				};
			};
			document_id_photo: {
				media: {
					id: string;
					type: string;
					created: string;
					last_updated: string;
				};
			};
		}>;
		supplementary_documents: any[];
		liveness_capture: any[];
		face_capture: Array<{
			id: string;
			tasks: any[];
			source: {
				type: string;
			};
			created_at: string;
			last_updated: string;
			image: {
				media: {
					id: string;
					type: string;
					created: string;
					last_updated: string;
				};
			};
		}>;
		applicant_profiles: Array<{
			id: string;
			tasks: any[];
			source: {
				type: string;
			};
			created_at: string;
			last_updated: string;
			media: {
				id: string;
				type: string;
				created: string;
				last_updated: string;
			};
		}>;
	};
	checks: Array<{
		type: string;
		id: string;
		state: string;
		resources_used: string[];
		generated_media: any[];
		report?: {
			recommendation: {
				value: string;
			};
			breakdown: Array<{
				sub_check: string;
				result: string;
				details: Array<{
					name: string;
					value: string;
				}>;
			}>;
		};
		created: string;
		last_updated: string;
		scheme?: string;
	}>;
	user_tracking_id: string;
}

export interface YotiCheckRecommendation {
	value: string;
	reason?: string;
}

export interface YotiDocumentFields {
	full_name: string;
	given_names: string;
	family_name: string;
	date_of_birth: string; 
	structured_postal_address?: YotiDocumentFieldsAddressInfo; 
	document_number?: string;
	expiration_date?: string;
	issuing_country?: string;
	date_of_issue?: string;
	issuing_authority?: string;
	formatted_address?: string;
	place_of_issue?: string;
}

export interface YotiDocumentFieldsAddressInfo {
	address_line1: string;
	building_number: string;
	town_city: string;
	postal_code: string; 
	country: string; 
}
