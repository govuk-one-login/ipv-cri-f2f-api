export enum YotiDocumentTypesEnum {
	UKPASSPORT = "PASSPORT",
	UKPHOTOCARDDL = "DRIVING_LICENCE",
	BRP = "RESIDENCE_PERMIT",
	OTHERPASSPORT = "",
	EUPHOTOCARDDL = "",
	EUIDENTITYCARD = "",
	CITIZENCARD = "",
	YOUNGSCOTNATIONALENTITLEMENTCARD = ""
}

export const YOTI_DOCUMENT_COUNTRY_CODE = "GBR"

export const MANUAL_CHECK_TYPE = "IBV"

export const YOTI_SESSION_TOPICS = ["SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED"];
export const IBV_VISUAL_REVIEW_CHECK = {
	"type": "IBV_VISUAL_REVIEW_CHECK",
	"config": {
		"manual_check": MANUAL_CHECK_TYPE,
	},
};

export const PROFILE_DOCUMENT_MATCH = {
	"type": "PROFILE_DOCUMENT_MATCH",
	"config": {
		"manual_check": MANUAL_CHECK_TYPE,
	},
};

export const DOCUMENT_SCHEME_VALIDITY_CHECK = {
	"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
	"config": {
		"manual_check": MANUAL_CHECK_TYPE,
		"scheme": "UK_DBS",
	},
};

export const REQUESTED_CHECKS = {
	IBV_VISUAL_REVIEW_CHECK,PROFILE_DOCUMENT_MATCH,DOCUMENT_SCHEME_VALIDITY_CHECK
}

export const YOTI_REQUIRED_DOCUMENTS = {
	"type": "IBV_VISUAL_REVIEW_CHECK",
	"config": {
		"manual_check": MANUAL_CHECK_TYPE,
	},
};

export const UK_POST_OFFICE = {
	type: "UK_POST_OFFICE",
	name: "UK Post Office Branch"
}

