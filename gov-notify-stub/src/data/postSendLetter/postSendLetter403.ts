export const POST_SEND_LETTER_403_API_KEY = {
	"errors": [
		{
			"error": "BadRequestError",
			"message": "Can't send letters with a team API key",
		},
	],
	"status_code": 403,
};

export const POST_SEND_LETTER_403_SYSTEM_CLOCK = {
	"errors": [
		{
			"error": "AuthError",
			"message": "Error: Your system clock must be accurate to within 30 seconds",
		},
	],
	"status_code": 403,
};

export const POST_SEND_LETTER_403_INVALID_TOKEN = {
	"errors": [
		{
			"error": "AuthError",
			"message": "Invalid token: API key not found",
		},
	],
	"status_code": 403,
};
