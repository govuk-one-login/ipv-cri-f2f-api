export interface PersonIdentityNamePart {
	type: string;
	value: string;
}

export interface PersonIdentityName {
	nameParts: PersonIdentityNamePart[];
}

export interface PersonIdentityAddress {
	uprn: number;
	organisationName?: string;
	departmentName?: string;
	subBuildingName?: string;
	buildingNumber: string;
	buildingName: string;
	dependentStreetName?: string;
	streetName: string;
	doubleDependentAddressLocality?: string;
	dependentAddressLocality?: string;
	addressLocality: string;
	postalCode: string;
	poBoxNumber?: string;
	addressCountry: string;
	validFrom?: string;
	validUntil?: string;
	preferredAddress: boolean;
}

export interface PersonIdentityDateOfBirth {
	value: string;
}

export interface PersonEmailAddress {
	value: string;
}

export interface PersonIdentityItem {
	sessionId: string;
	addresses: PersonIdentityAddress[];
	name: PersonIdentityName[];
	birthDate: PersonIdentityDateOfBirth[];
	emailAddress: string;
	expiryDate: number;
	createdDate: number;
	pdfPreference?: string;
}

export interface SharedClaimsPersonIdentity {
	sessionId: string;
	address: PersonIdentityAddress[];
	name: PersonIdentityName[];
	birthDate: PersonIdentityDateOfBirth[];
	emailAddress: string;
}
