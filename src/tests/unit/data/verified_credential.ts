import { Constants } from "../../../utils/Constants";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";

export const VALID_VC = {
	"sub":"sub",
	"nbf":absoluteTimeNow(),
	"iss":"https://XXX-c.env.account.gov.uk",
	"iat":absoluteTimeNow(),
	"vc":{
		 "@context":[
			Constants.W3_BASE_CONTEXT,
			Constants.DI_CONTEXT,
		 ],
		 "type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
		 "credentialSubject":{
			"name":[
					 {
					"nameParts":[
								 {
							"type":"GivenName",
							"value":"Frederick",
								 },
								 {
							"type":"GivenName",
							"value":"Joseph",
								 },
								 {
							"type":"FamilyName",
							"value":"Flintstone",
								 },
					],
					 },
			],
			"birthDate":[
					 {
					"value":"1960-02-02",
					 },
			],
		 },
	},
}
;
