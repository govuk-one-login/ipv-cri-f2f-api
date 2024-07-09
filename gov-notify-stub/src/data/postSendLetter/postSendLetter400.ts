export const POST_SEND_LETTER_400_MISSING_ADDRESS = {
	"errors": [
		{
			"error": "ValidationError",
			"message": "personalisation address_line_1 is a required property",
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
			"message": "Cannot send letters when service is in trial mode - see https://www.notifications.service.gov.uk/trial-mode",
		},
	],
	"status_code": 400,
};
