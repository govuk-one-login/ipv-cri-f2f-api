/* eslint-disable @typescript-eslint/unbound-method */
import { APIGatewayProxyEvent } from "aws-lambda";
import { Constants } from "../../utils/Constants";
import { lambdaHandler } from "../../SessionConfigHandler";
import { mock } from "jest-mock-extended";

import { AppError } from "../../utils/AppError";
import { SessionConfigRequestProcessor } from "../../services/SessionConfigRequestProcessor";
import { VALID_SESSION_CONFIG } from "./data/session-config-events";

const mockSessionConfigRequestProcessor = mock<SessionConfigRequestProcessor>();

describe("SessionConfigHandler", () => {
	const event = {
		requestContext: { requestId: "sampleRequestId" },
		headers: {},
	} as APIGatewayProxyEvent;

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should return BAD_REQUEST when sessionId header is missing", async () => {
		const response = await lambdaHandler(event, {});
		expect(response.statusCode).toBe(400);
		expect(response.body).toBe("Missing header: x-govuk-signin-session-id is required");
	});

	it("should return BAD_REQUEST when sessionId is not a valid UUID", async () => {
		event.headers = {
			[Constants.X_SESSION_ID]: "invalid-session-id",
		};
		const response = await lambdaHandler(event, {});
		expect(response.statusCode).toBe(400);
		expect(response.body).toBe("Session id is not a valid uuid");
	});

	it("should call processRequest when sessionId is valid", async () => {
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);
		await lambdaHandler(VALID_SESSION_CONFIG, {});
		expect(mockSessionConfigRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("should return custom AppError when thrown from the processor", async () => {
		const customError = new AppError(500, "Random Error");
		mockSessionConfigRequestProcessor.processRequest.mockRejectedValueOnce(customError);
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);

		const response = await lambdaHandler(VALID_SESSION_CONFIG, {});
		expect(response.statusCode).toBe(500);
		expect(response.body).toBe("Random Error");
	});

	it("should return SERVER_ERROR when any unexpected error occurs", async () => {
		mockSessionConfigRequestProcessor.processRequest.mockRejectedValueOnce(new Error("Unexpected error"));
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);

		const response = await lambdaHandler(VALID_SESSION_CONFIG, {});
		expect(response.statusCode).toBe(500);
		expect(response.body).toBe("SessionConfigProcessor encoundered an error.");
	});
});
