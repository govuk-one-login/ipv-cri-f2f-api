export interface NamePart {
	type: string;
	value: string;
}

export interface Name {
	nameParts: NamePart[];
}

export interface BirthDate {
	value: string;
}

export interface Address {
	uprn: number;
	organisationName: string;
	departmentName: string;
	subBuildingName: string;
	buildingNumber: string;
	buildingName: string;
	dependentStreetName: string;
	streetName: string;
	doubleDependentAddressLocality: string;
	dependentAddressLocality: string;
	addressLocality: string;
	postalCode: string;
	addressCountry: string;
	validFrom: string;
	validUntil: string;
}

//TODO: Making emailAddress & address optinal until work on F2F-474 is completed
export interface PersonIdentity {
	names: Name[];
	birthDates: BirthDate[];
	address?: Address[];
	sessionId: string;
	emailAdress?: string;
}
