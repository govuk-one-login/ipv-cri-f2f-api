import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { Constants } from "./Constants";

export const getSessionIdHeaderErrors = (headers: APIGatewayProxyEventHeaders): string | void => {
	const sessionId = headers[Constants.X_SESSION_ID];
	if (!sessionId) {
		return `Missing header: ${Constants.X_SESSION_ID} is required`;
	}

	if (!Constants.REGEX_UUID.test(sessionId)) {
		return `${Constants.X_SESSION_ID} header does not contain a valid uuid`;
	}
};
