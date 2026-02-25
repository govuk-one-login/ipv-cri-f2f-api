import { PersonIdentityAddress, PersonIdentityItem } from "../../../models/PersonIdentityItem";

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

export const person: PersonIdentityItem = {
	"addresses": [
		{
			"uprn": 123456789,
			"organisationName": "Test org",
			"buildingName": "Sherman",
			"streetName": "Wallaby Way",
			"buildingNumber": "32",
			"addressLocality": "Sidney",
			"postalCode": "F1 1SH",
			"addressCountry": "GB",
			"preferredAddress": true,
		},
	],
	"sessionId": "RandomF2FSessionID",
	"emailAddress": "viveak.vadivelkarasan@digital.cabinet-office.gov.uk",
	"birthDate": [
		{
			"value":"1960-02-02",
		},
	],
	"name": [
		{
			"nameParts": [
				{
					"type": "GivenName",
					"value": "Frederick",
				},
				{
					"type": "GivenName",
					"value": "Joseph",
				},
				{
					"type": "FamilyName",
					"value": "Flintstone",
				},
			],
		},
	],
	expiryDate: 1612345678,
	createdDate: 1612335678,
};

export const personAddressAllAddressFields: PersonIdentityItem = {
  ...person,
  addresses: [
    {
      ...person.addresses[0],
	  departmentName: "Test dept",
	  subBuildingName: "Flat 5",
	  dependentStreetName: "Ocean View",
	  dependentAddressLocality: "Southside"
    },
  ],
};
