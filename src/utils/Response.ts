import { HttpCodesEnum } from "./HttpCodesEnum";

export class Response {
	constructor(
		public statusCode: number,
		public body: string,
		public headers?: { [header: string]: boolean | number | string } | undefined,
		public multiValueHeaders?: { [header: string]: Array<boolean | number | string> } | undefined,
	) { }
}

export const SECURITY_HEADERS = {
	"Cache-Control": "no-store",
	"Content-Type": "application/json",
	"Strict-Transport-Security": "max-age=31536000",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
};

export const GenericServerError = {
	statusCode: HttpCodesEnum.SERVER_ERROR,
	headers: SECURITY_HEADERS,
	body: "Internal server error",
};

export const unauthorizedResponse = (errorDescription: string) => {
	return {
		statusCode: HttpCodesEnum.UNAUTHORIZED,
		headers: SECURITY_HEADERS,
		body: JSON.stringify({
			redirect: null,
			message: errorDescription,
		}),
	};
};
