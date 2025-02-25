import { PdfPreferenceEnum } from "../../../utils/PdfPreferenceEnum";

export const VALID_REQUEST = {
	httpMethod: "POST",
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.EMAIL_ONLY,
	}),
	headers: {
		// pragma: allowlist secret
		"x-govuk-signin-session-id": "e4c0b0d8-a4a4-4c3b-91e2-44e743fcdbf9",
	},
	isBase64Encoded: false,
	multiValueHeaders: {},
	multiValueQueryStringParameters: {},
	path: "/documentSelection",
	pathParameters: {},
	queryStringParameters: {},
	requestContext: {
		accountId: "",
		apiId: "",
		authorizer: {},
		httpMethod: "post",
		identity: {
			accessKey: "",
			accountId: "",
			apiKey: "",
			apiKeyId: "",
			caller: "",
			clientCert: {
				clientCertPem: "",
				issuerDN: "",
				serialNumber: "",
				subjectDN: "",
				validity: { notAfter: "", notBefore: "" },
			},
			cognitoAuthenticationProvider: "",
			cognitoAuthenticationType: "",
			cognitoIdentityId: "",
			cognitoIdentityPoolId: "",
			principalOrgId: "",
			sourceIp: "",
			user: "",
			userAgent: "",
			userArn: "",
		},
		path: "/documentSelection",
		protocol: "HTTP/1.1",
		requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
		requestTimeEpoch: 1428582896000,
		resourceId: "123456",
		resourcePath: "/documentSelection",
		stage: "dev",
	},
	resource: "/documentSelection",
	stageVariables: {},
};

export const VALID_NON_UK_PASSPORT_REQUEST = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"nonUkPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.EMAIL_ONLY,
	}),
};

export const VALID_EEA_ID_CARD_REQUEST = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"eeaIdentityCard",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.EMAIL_ONLY,
	}),
};

export const RESOURCE_NOT_FOUND = {
	...VALID_REQUEST,
	resource: "/invalid",
};

export const UNSUPPORTED_METHOD = {
	...VALID_REQUEST,
	httpMethod: "GET",
};

export const INVALID_SESSION_ID = {
	...VALID_REQUEST,
	headers: {
		"x-govuk-signin-session-id": "SomeInvalidSessionID",
	},
};

export const MISSING_SESSION_ID = {
	...VALID_REQUEST,
	headers: {},
}
;
export const MISSING_PDF_PREFERENCE = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
	}),
};

// User opts for Printed Customer Letter option
export const PCL_VALID_REQUEST = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.PRINTED_LETTER,
	}),
};

export const PCL_VALID_REQUEST_WITH_POSTAL_ADDRESS = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.PRINTED_LETTER,
		"postal_address": 
            {
            	"uprn": 1235,
            	"buildingNumber": "2",
            	"buildingName": "The Cave",
            	"postalCode": "R1 0CK",
            	"streetName": "Rocky Road",
            	"addressLocality": "Bedrock",
            	"addressCountry": "CARTOONLAND",
            	"preferredAddress": true,
            },
	}),
};

export const PCL_MISSING_POSTAL_CODE = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.PRINTED_LETTER,
		"postal_address": 
            {
            	"uprn": 1235,
            	"buildingNumber": "2",
            	"buildingName": "The Cave",
            	"streetName": "Rocky Road",
            	"addressLocality": "Bedrock",
            	"addressCountry": "CARTOONLAND",
            	"preferredAddress": true,
            },
	}),
};

export const PCL_MISSING_BUILDING_NAME_AND_NUMBER = {
	...VALID_REQUEST,
	body: JSON.stringify({
		"document_selection":{
			"document_selected":"ukPassport",
			"date_of_expiry":"1970-01-01",
		},
		"post_office_selection":{
			"address":"1 The Street, Funkytown",
			"location":{
				"latitude":0.34322,
				"longitude":-42.48372,
			},
			"post_code":"SW19 4NS",
		},
		"pdf_preference": PdfPreferenceEnum.PRINTED_LETTER,
		"postal_address": 
            {
            	"uprn": 123456787,
            	"buildingNumber": "32",
            	"buildingName": "London",
            	"subBuildingName": "Flat 20",
            	"streetName": "Demo",
            	"addressLocality": "London",
            	"addressCountry": "GB",
            	"postalCode": "BA2 5AA",
            },
	}),
};

