export enum MessageCodes {
	RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
	METHOD_NOT_IMPLEMENTED = "METHOD_NOT_IMPLEMENTED",
	SERVER_ERROR = "SERVER_ERROR",
	MISSING_CONFIGURATION = "MISSING_CONFIGURATION",
	INVALID_AUTH_CODE = "INVALID_AUTH_CODE",
	SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
	PERSON_NOT_FOUND = "PERSON_NOT_FOUND",
	STATE_MISMATCH = "STATE_MISMATCH",
	INVALID_CLAIMED_IDENTITY = "INVALID_CLAIMED_IDENTITY",
	ERROR_SIGNING_VC = "ERROR_SIGNING_VC",
	ERROR_WRITING_TXMA = "ERROR_WRITING_TXMA",
	UNRECOGNISED_CLIENT = "UNRECOGNISED_CLIENT",
	FAILED_DECRYPTING_JWE = "FAILED_DECRYPTING_JWE",
	FAILED_VALIDATING_SESSION_ID = "FAILED_VALIDATING_SESSION_ID",
	FAILED_DECODING_JWT = "FAILED_DECODING_JWT",
	FAILED_VERIFYING_JWT = "FAILED_VERIFYING_JWT",
	MISSING_HEADER = "MISSING_HEADER",
	EXPIRED_SESSION = "EXPIRED_SESSION",
	INCORRECT_SESSION_STATE = "INCORRECT_SESSION_STATE",
	UNEXPECTED_ERROR_SESSION_EXISTS = "UNEXPECTED_ERROR_SESSION_EXISTS",
	FAILED_CREATING_SESSION = "FAILED_CREATING_SESSION",
	FAILED_SAVING_PERSON_IDENTITY = "FAILED_SAVING_PERSON_IDENTITY",
	FAILED_TO_WRITE_TXMA = "FAILED_TO_WRITE_TXMA",
	UNEXPECTED_ERROR_VERIFYING_JWT = "UNEXPECTED_ERROR_VERIFYING_JWT",
	FAILED_VALIDATING_JWT = "FAILED_VALIDATING_JWT",
	SESSION_ALREADY_EXISTS = "SESSION_ALREADY_EXISTS",
	INVALID_SESSION_ID = "INVALID_SESSION_ID",
	MISSING_SESSION_ID = "MISSING_SESSION_ID",
	EMPTY_HEADERS = "EMPTY_HEADERS",
	MISSING_MANDATORY_FIELDS = "MISSING_MANDATORY_FIELDS",
	ERROR_PARSING_PAYLOAD = "ERROR_PARSING_PAYLOAD",
	EMPTY_REQUEST = "EMPTY_REQUEST",
	FAILED_TO_WRITE_GOV_NOTIFY = "FAILED_TO_WRITE_GOV_NOTIFY",
	INCORRECT_BATCH_SIZE = "INCORRECT_BATCH_SIZE",
	BATCH_PROCESSING_FAILURE = "BATCH_PROCESSING_FAILURE",
	UNEXPECTED_VENDOR_MESSAGE = "UNEXPECTED_VENDOR_MESSAGE",
	VENDOR_SESSION_NOT_FOUND = "VENDOR_SESSION_NOT_FOUND",
	VENDOR_SESSION_STATE_MISMATCH = "VENDOR_SESSION_STATE_MISMATCH",
	VENDOR_SESSION_MISSING_DATA = "VENDOR_SESSION_MISSING_DATA",
	FAILED_SIGNING_JWT = "FAILED_SIGNING_JWT",
	FAILED_SENDING_VC = "FAILED_SENDING_VC",
	FAILED_FETCHING_SESSION = "FAILED_FETCHING_SESSION",
	FAILED_UPDATING_SESSION = "FAILED_UPDATING_SESSION",
	FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY = "FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY",
	FAILED_FETCHING_SESSION_BY_AUTH_CODE = "FAILED_FETCHING_SESSION_BY_AUTH_CODE",
	FAILED_DOCUMENT_SELECTION_ORCHESTRATION = "FAILED_DOCUMENT_SELECTION_ORCHESTRATION",
	FAILED_CREATING_YOTI_SESSION = "FAILED_CREATING_YOTI_SESSION",
	FAILED_FETCHING_YOTI_SESSION = "FAILED_FETCHING_YOTI_SESSION",
	FAILED_YOTI_PUT_INSTRUCTIONS = "FAILED_YOTI_PUT_INSTRUCTIONS",
	FAILED_YOTI_GET_INSTRUCTIONS = "FAILED_YOTI_GET_INSTRUCTIONS",
	FAILED_YOTI_GET_MEDIA_CONTENT = "FAILED_YOTI_GET_MEDIA_CONTENT",
	FAILED_YOTI_GET_SESSION = "FAILED_YOTI_GET_SESSION",
	FAILED_FETCHING_PERSON_IDENTITY = "FAILED_FETCHING_PERSON_IDENTITY",
	FAILED_FETCHING_BY_YOTI_SESSIONID = "FAILED_FETCHING_BY_YOTI_SESSIONID",
}
