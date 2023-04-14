import { Constants } from "../../../utils/Constants";

export const VALID_VC = {
	"iat": 1667385481,
	"iss": "https://XXX-c.env.account.gov.uk",
	"sub": "sub",
	"nbf": 1667385481,
	"jti": "uuid",
	"vc": {
		"@context": [
			Constants.W3_BASE_CONTEXT,
			Constants.DI_CONTEXT,
		],
		"credentialSubject": {
			"name": [
				{
					"nameParts": [
						{ "type": "GivenName", "value": "FRED" },
						{ "type": "GivenName", "value": "NICK" },
						{ "type": "FamilyName", "value": "OTHER" },
						{ "type": "FamilyName", "value": "NAME" },
					],
				},
			],
			"birthDate": [{ "value": "01-01-1960" }],
		},
		"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_ASSERTION_CREDENTIAL],
	},
}
	;
