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
			"addressCountry": "GB",
			"organisationName": "Test org",
			"departmentName": "Test dept",
			"buildingName": "Sherman",
			"uprn": 123456789,
			"streetName": "Wallaby Way",
			"postalCode": "F1 1SH",
			"buildingNumber": "32",
			"addressLocality": "Sidney",
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

export const personAddressSubBuildingName: PersonIdentityItem = {
  ...person,
  addresses: [
    {
      ...person.addresses[0],
      subBuildingName: "Flat 5",
    },
  ],
};

export const personAddressDependentAddressLocality: PersonIdentityItem = {
	...person,
  addresses: [
    {
      ...person.addresses[0],
      dependentAddressLocality: "Southside",
    },
  ],
};

export const personAddressDependentStreetName: PersonIdentityItem = {
	...person,
  addresses: [
    {
      ...person.addresses[0],
      dependentStreetName: "Ocean View",
    },
  ],
};
