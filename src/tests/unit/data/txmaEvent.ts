const TXMA_EXTENSION = {
	extensions: {
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
			},
		],
	},
};

export const TXMA_CORE_FIELDS = {
	"client_id": "ipv-core-stub",
	"component_id": "https://XXX-c.env.account.gov.uk",
	"event_name": "F2F_YOTI_RESPONSE_RECEIVED",
	"timestamp": 1,
	"extensions": {
		"evidence": [
			{
				"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
			},
		],
	},
	"user": {
		"govuk_signin_journey_id": "sdfssg",
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
		"name": "ANGELA ZOE UK SPECIMEN",
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
		"name": "LEEROY JENKINS",
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
		"name": "Erika - Mustermann",
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
		"name": "Wiieke Liselotte De Bruijn",
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
		"name": "TECH REFRESH ICTHREEMALE",
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
