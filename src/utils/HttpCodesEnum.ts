export enum HttpCodesEnum {
	OK = 200,
	CREATED = 201,
	ACCEPTED = 202,
	NO_CONTENT = 204,
	PARTIAL_CONTENT = 206,
	MULTI_STATUS = 207,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	PAYMENT_REQUIRED = 402,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	METHOD_NOT_ALLOWED = 405,
	NOT_ACCEPTABLE = 406,
	PROXY_AUTHENTICATION_REQUIRED = 407,
	REQUEST_TIMEOUT = 408,
	CONFLICT = 409,
	GONE = 410,
	PRECONDITION_FAILED = 412,
	PAYLOAD_TOO_LARGE = 413,
	URI_TOO_LONG = 414,
	UNSUPPORTED_MEDIA_TYPE = 415,
	RANGE_NOT_SATISFIABLE = 416,
	EXPECTATION_FAILED = 417,
	IM_A_TEAPOT = 418,
	PAGE_EXPIRED = 419,
	ENHANCE_YOUR_CALM = 420,
	MISDIRECTED_REQUEST = 421,
	UNPROCESSABLE_ENTITY = 422,
	LOCKED = 423,
	FAILED_DEPENDENCY = 424,
	TOO_EARLY = 425,
	UPGRADE_REQUIRED = 426,
	PRECONDITION_REQUIRED = 428,
	TOO_MANY_REQUESTS = 429,
	REQUEST_HEADER_FIELDS_TOO_LARGE_SHOPIFY = 430,
	REQUEST_HEADER_FIELDS_TOO_LARGE = 431,
	RETRY_WITH = 449,
	UNAVAILABLE_FOR_LEGAL_REASONS = 451,
	RESTRICTED_CLIENT = 463,
	REQUEST_HEADER_TOO_LARGE = 494,
	SSL_CERTIFICATE_REQUIRED = 496,
	HTTP_REQUEST_SENT_TO_HTTPS_PORT = 497,
	CLIENT_CLOSED = 499,
	SERVER_ERROR = 500,
	NOT_IMPLEMENTED = 501,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
	GATEWAY_TIMEOUT = 504,
	HTTP_VERSION_NOT_SUPPORTED = 505,
	VARIANT_ALSO_NEGOTIATES = 506,
	INSUFFICIENT_STORAGE = 507,
	LOOP_DETECTED = 508,
	BANDWIDTH_LIMIT_EXCEEDED = 509,
	NOT_EXTENDED = 510,
	NETWORK_AUTHENTICATION_REQUIRED = 511,
	UNKNOWN_ERROR = 520,
	ORIGIN_UNREACHABLE = 523,
	INVALID_SSL_CERTIFICATE = 526,
	RAILGUN_ERROR = 527,
	SITE_IS_FROZEN = 530,
	ELB_UNAUTHORIZED = 561,
}
