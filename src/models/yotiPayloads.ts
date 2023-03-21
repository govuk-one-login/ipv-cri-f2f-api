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
