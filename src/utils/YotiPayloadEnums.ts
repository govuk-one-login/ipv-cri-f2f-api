export enum YotiDocumentTypesEnum {
	UKPASSPORT = "PASSPORT",
	UKPHOTOCARDDL = "DRIVING_LICENCE",
	BRP = "RESIDENCE_PERMIT",
	OTHERPASSPORT = "",
	EUPHOTOCARDDL = "",
	EUIDENTITYCARD = "",
	CITIZENCARD = "",
	YOUNGSCOTNATIONALENTITLEMENTCARD = "",
}

export const YOTI_DOCUMENT_COUNTRY_CODE = "GBR";

export const MANUAL_CHECK_TYPE = {
	IBV: "IBV",
	FALLBACK: "FALLBACK",
};

export const YOTI_SESSION_TOPICS = ["SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED"];

export const YOTI_CHECKS = {
	IBV_VISUAL_REVIEW_CHECK: {
		"type": "IBV_VISUAL_REVIEW_CHECK",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.IBV,
		},
	},
	PROFILE_DOCUMENT_MATCH : {
		"type": "PROFILE_DOCUMENT_MATCH",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.IBV,
		},
	},
	DOCUMENT_SCHEME_VALIDITY_CHECK : {
		"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.IBV,
			"scheme": "UK_DBS",
		},
	},
	ID_DOCUMENT_AUTHENTICITY : {
		"type": "ID_DOCUMENT_AUTHENTICITY",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.FALLBACK,
		},
	},
	ID_DOCUMENT_FACE_MATCH : {
		"type": "ID_DOCUMENT_FACE_MATCH",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.FALLBACK,
		},
	},
};

export const YOTI_TASKS = {
	ID_DOCUMENT_TEXT_DATA_EXTRACTION: {
		"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
		"config": {
			"manual_check": MANUAL_CHECK_TYPE.FALLBACK,
		},
	},
};

export const YOTI_REQUESTED_CHECKS = [ YOTI_CHECKS.IBV_VISUAL_REVIEW_CHECK, YOTI_CHECKS.PROFILE_DOCUMENT_MATCH, YOTI_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK, YOTI_CHECKS.ID_DOCUMENT_AUTHENTICITY, YOTI_CHECKS.ID_DOCUMENT_FACE_MATCH];

export const YOTI_REQUESTED_TASKS = [ YOTI_TASKS.ID_DOCUMENT_TEXT_DATA_EXTRACTION];

export const UK_POST_OFFICE = {
	type: "UK_POST_OFFICE",
	name: "UK Post Office Branch",
};

