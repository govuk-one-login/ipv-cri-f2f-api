export const POST_SEND_LETTER_400_PDF_FORMAT = {
	"errors": [
		{
			"error": "BadRequestError",
			"message": "Letter content is not a valid PDF",
		},
	],
	"status_code": 400,
};

export const POST_SEND_LETTER_400_NO_REFERENCE = {
	"errors": [
		{
			"error": "ValidationError",
			"message": "reference is a required property",
		},
	],
	"status_code": 400,
};

export const POST_SEND_LETTER_400_POSTAGE_INVALID = {
	"errors": [
		{
			"error": "ValidationError",
			"message": "postage invalid. It must be either first or second",
		},
	],
	"status_code": 400,
};

export const POST_SEND_LETTER_400_TRIAL_MODE = {
	"errors": [
		{
			"error": "BadRequestError",
			"message": "Can't send letters when service is in trial mode - see https://www.notifications.service.gov.uk/trial-mode",
		},
	],
	"status_code": 400,
};
