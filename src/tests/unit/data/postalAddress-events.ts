import { PersonIdentityAddress } from "../../../models/PersonIdentityItem";

export const postalAddressSameInputRecord: PersonIdentityAddress = {
	uprn: 1234,
	buildingNumber: "1",
	buildingName: "The Cave",
	streetName: "Rocky Road",
	addressLocality: "Bedrock",
	postalCode: "R1 0CK",
	addressCountry: "CARTOONLAND",
	preferredAddress: true,
};

export const postalAddressDifferentInputRecord: PersonIdentityAddress = {
	uprn: 1235,
	buildingNumber: "2",
	buildingName: "The Cave",
	streetName: "Rocky Road",
	addressLocality: "Bedrock",
	postalCode: "R1 0CK",
	addressCountry: "CARTOONLAND",
	preferredAddress: true,
};
