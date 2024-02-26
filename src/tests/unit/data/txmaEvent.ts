const TXMA_EXTENSION = {
	extensions: {
		"previous_govuk_signin_journey_id": "sdfssg",
		evidence: [
			{
				"type": "IdentityCheck",
				"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
				"strengthScore": 3,
				"validityScore": 2,
				"verificationScore": 3,
				"checkDetails": [
					{
						"checkMethod": "vri",
						"identityCheckPolicy": "published",

					},
					{
						"checkMethod": "pvr",
						"photoVerificationProcessLevel": 3,
					},
				],
				"ci": undefined,
				"ciReasons": [],
			},
		],
	},
};

export const TXMA_CORE_FIELDS = {
	"client_id": "ipv-core-stub",
	"component_id": "https://XXX-c.env.account.gov.uk",
	"event_name": "F2F_YOTI_RESPONSE_RECEIVED",
	"timestamp": 1,
	"event_timestamp_ms": 1000,
	"extensions": {
		"previous_govuk_signin_journey_id": "sdfssg",
		"evidence": [
			{
				"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
			},
		],
	},
	"user": {
		"ip_address": "127.0.0.1",
		"persistent_session_id": "sdgsdg",
		"session_id": "RandomF2FSessionID",
		"user_id": "testsub",
		"email": undefined,
	},
};

export const TXMA_VC_ISSUED = {
	...TXMA_CORE_FIELDS,
	...TXMA_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "ANGELA", "type": "GivenName" },
				{ "value": "ZOE", "type": "GivenName" },
				{ "value": "UK SPECIMEN", "type": "FamilyName" },
			],
		}],
		"birthDate": [
			{
				"value": "1988-12-04",
			},
		],
		"passport": [
			{
				"documentType": "PASSPORT",
				"documentNumber": "533401372",
				"expiryDate": "2025-09-28",
				"icaoIssuerCode": "GBR",
			},
		],
	},
};

export const TXMA_DL_VC_ISSUED = {
	...TXMA_CORE_FIELDS,
	...TXMA_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "LEEROY", "type": "GivenName" },
				{ "value": "JENKINS", "type": "FamilyName" },
			],
		}],
		"birthDate": [
			{
				"value": "1988-12-04",
			},
		],
		"drivingPermit": [
			{
				"documentType": "DRIVING_LICENCE",
				"personalNumber": "LJENK533401372",
				"expiryDate": "2025-09-28",
				"issuingCountry": "GBR",
				"issuedBy": "DVLA",
				"issueDate": "2015-09-28",
				"fullAddress": "122 BURNS CRESCENT\nStormwind\nEH1 9GP",
			},
		],
	},
};

export const TXMA_EU_DL_VC_ISSUED = {
	...TXMA_CORE_FIELDS,
	...TXMA_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "Erika", "type": "GivenName" },
				{ "value": "-", "type": "GivenName" },
				{ "value": "Mustermann", "type": "FamilyName" },
			],
		}],
		"birthDate": [
			{
				"value": "1988-12-04",
			},
		],
		"drivingPermit": [
			{
				"documentType": "DRIVING_LICENCE",
				"personalNumber": "Z021AB37X13",
				"expiryDate": "2036-03-19",
				"issuingCountry": "DEU",
				"issuedBy": "Landratsamt Mu sterhausen amSee",
				"issueDate": "2021-03-20",
			},
		],
	},
};

export const TXMA_EEA_VC_ISSUED = {
	...TXMA_CORE_FIELDS,
	...TXMA_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "Wiieke", "type": "GivenName" },
				{ "value": "Liselotte", "type": "GivenName" },
				{ "value": "De Bruijn", "type": "FamilyName" },
			],
		}],
		"birthDate": [
			{
				"value": "1988-12-04",
			},
		],
		"idCard": [
			{
				"documentType": "NATIONAL_ID",
				"documentNumber": "SPEC12031",
				"expiryDate": "2031-08-02",
				"icaoIssuerCode": "NLD",
				"issueDate": "2021-08-02",
			},
		],
	},
};

export const TXMA_BRP_VC_ISSUED = {
	...TXMA_CORE_FIELDS,
	...TXMA_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "TECH", "type": "GivenName" },
				{ "value": "REFRESH", "type": "GivenName" },
				{ "value": "ICTHREEMALE", "type": "FamilyName" },
			],
		}],
		"birthDate": [
			{
				"value": "1988-12-04",
			},
		],
		"residencePermit": [
			{
				"documentType": "RESIDENCE_PERMIT",
				"documentNumber": "RF9082242",
				"expiryDate": "2024-11-11",
				"issueDate": "2015-05-19",
				"icaoIssuerCode": "GBR",
			},
		],
	},
};

const TXMA_YOTI_START_EXTENSION = {
	extensions: {
		"evidence": [
			{
				"txn": "b83d54ce-1565-42ee-987a-97a1f48f27dg",
			},
		],
		"post_office_details": [
			{
				"address": "1 The Street, Funkytown",
				"location": [
					{
						"latitude": 0.34322,
						"longitude": -42.48372,
					},
				],
				"name": undefined,
				"post_code": "SW19 4NS",
			},
		],
	},
};


export const TXMA_PASSPORT_YOTI_START = {
	...TXMA_CORE_FIELDS,
	...TXMA_YOTI_START_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "Frederick", "type": "GivenName" },
				{ "value": "Joseph", "type": "GivenName" },
				{ "value": "Flintstone", "type": "FamilyName" },
			],
		}],
		"passport": [
			{
				"documentType": "PASSPORT",
				"issuingCountry": undefined,
			},
		],
	},
	"timestamp": 1684933200,
	"event_timestamp_ms": 1684933200000,
	"user": {
		"govuk_signin_journey_id": "sdfssg",
		"ip_address": "127.0.0.1",
		"persistent_session_id": "sdgsdg",
		"session_id": "RandomF2FSessionID",
		"user_id": "sub",
	},
};

export const TXMA_NATIONAL_ID_YOTI_START = {
	...TXMA_CORE_FIELDS,
	...TXMA_YOTI_START_EXTENSION,
	restricted: {
		"name": [{
			"nameParts": [
				{ "value": "Frederick", "type": "GivenName" },
				{ "value": "Joseph", "type": "GivenName" },
				{ "value": "Flintstone", "type": "FamilyName" },
			],
		}],
		"idCard": [
			{
				"documentType": "NATIONAL_ID",
				"issuingCountry": undefined,
			},
		],
	},
	"timestamp": 1684933200,
	"event_timestamp_ms": 1684933200000,
	"user": {
		"govuk_signin_journey_id": "sdfssg",
		"ip_address": "127.0.0.1",
		"persistent_session_id": "sdgsdg",
		"session_id": "RandomF2FSessionID",
		"user_id": "sub",
	},
};
