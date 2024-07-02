import { SharedClaimsPersonIdentity } from "../../../models/PersonIdentityItem";

export const personIdentityInputRecord: SharedClaimsPersonIdentity = {
	sessionId: "1234",
	address: [{
		uprn: 1234,
		buildingNumber: "1",
		buildingName: "The Cave",
		streetName: "Rocky Road",
		addressLocality: "Bedrock",
		postalCode: "R1 0CK",
		addressCountry: "CARTOONLAND",
		preferredAddress: true,
	}],
	name: [{
		nameParts: [
			{
				type: "givenName",
				value: "Frederick",
			},
			{
				type: "familyName",
				value: "Flintstone",
			},
		],
	}],
	birthDate: [{
		value: "1900-01-01",
	}],
	emailAddress: "hello@example.com",
};

export const personIdentityOutputRecord = {
	addresses: [{
		uprn: 1234,
		buildingNumber: "1",
		buildingName: "The Cave",
		streetName: "Rocky Road",
		addressLocality: "Bedrock",
		postalCode: "R1 0CK",
		addressCountry: "CARTOONLAND",
		preferredAddress: true,
	}],
	birthDate: [{
		value: "1900-01-01",
	}],
	emailAddress: "hello@example.com",
	name: [{
		nameParts: [
			{
				type: "givenName",
				value: "Frederick",
			},
			{
				type: "familyName",
				value: "Flintstone",
			},
		],
	}],
};

export const personIdentityOutputRecordTwoAddresses = {
	addresses: [{
		uprn: 1234,
		buildingNumber: "1",
		buildingName: "The Cave",
		streetName: "Rocky Road",
		addressLocality: "Bedrock",
		postalCode: "R1 0CK",
		addressCountry: "CARTOONLAND",
		preferredAddress: false,
	}], //second address appended here when test is run
	birthDate: [{
		value: "1900-01-01",
	}],
	emailAddress: "hello@example.com",
	name: [{
		nameParts: [
			{
				type: "givenName",
				value: "Frederick",
			},
			{
				type: "familyName",
				value: "Flintstone",
			},
		],
	}],
};
