export const POST_SEND_LETTER_429_API_KEY = {
	"errors": [
		{
			"error": "RateLimitError",
			"message": "Exceeded rate limit for key type live of 10 requests per 20 seconds",
		},
	],
	"status_code": 429,
};

export const POST_SEND_LETTER_429_SERVICE_LIMIT = {
	"errors": [
		{
			"error": "TooManyRequestsError",
			"message": "Exceeded send limits (50) for today",
		},
	],
	"status_code": 429,
};
