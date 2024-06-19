import { PersonIdentityAddress } from "../../../models/PersonIdentityItem";

export const postalAddressSameInputRecord: PersonIdentityAddress = {
	uprn: 1234,
	buildingNumber: "1",
	buildingName: "The Cave",
	streetName: "Rocky Road",
	addressLocality: "Bedrock",
	postalCode: "R1 0CK",
	addressCountry: "CARTOONLAND",
	
};

export const postalAddressDifferentInputRecord: PersonIdentityAddress = {
	uprn: 1235,
	buildingNumber: "32",
	buildingName: "London",
	subBuildingName: "Flat 20",
	streetName: "Demo",
	addressLocality: "London",
	addressCountry: "GB",
	postalCode: "SW19",
};
