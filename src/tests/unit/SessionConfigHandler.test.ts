import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Constants } from "../../utils/Constants";
import { lambdaHandler } from "../../SessionConfigHandler";
import { mock } from "jest-mock-extended";
import { UNSUPPORTED_SESSION_CONFIG, VALID_SESSION_CONFIG } from "./data/session-config-events";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";

import { Response } from "../../utils/Response";
import { AppError } from "../../utils/AppError";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { SessionConfigRequestProcessor } from "../../services/SessionConfigRequestProcessor";

// jest.mock("@aws-lambda-powertools/logger");
// jest.mock("@aws-lambda-powertools/metrics");

const mockLogger = mock<Logger>();
const mockMetrics = new Metrics({ namespace: "F2F" });

const mockSessionConfigRequestProcessor = mock<SessionConfigRequestProcessor>();

describe("SessionConfigHandler", () => {
	let event: APIGatewayProxyEvent;

	beforeEach(() => {
		event = {
			requestContext: { requestId: "sampleRequestId" },
			headers: {},
		} as APIGatewayProxyEvent;
	});

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
		event.headers = {
			[Constants.X_SESSION_ID]: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		};
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);
		await lambdaHandler(event, {});
		expect(mockSessionConfigRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("should return custom AppError when thrown from the processor", async () => {
		event.headers = {
			[Constants.X_SESSION_ID]: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		};
        
		const customError = new AppError(500, "Random Error");
		mockSessionConfigRequestProcessor.processRequest.mockRejectedValueOnce(customError);
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);

		const response = await lambdaHandler(event, {});
		expect(response.statusCode).toBe(500);
		expect(response.body).toBe("Random Error");
	});

	it("should return SERVER_ERROR when any unexpected error occurs", async () => {
		event.headers = {
			[Constants.X_SESSION_ID]: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
		};

		mockSessionConfigRequestProcessor.processRequest.mockRejectedValueOnce(new Error("Unexpected error"));
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockSessionConfigRequestProcessor);

		const response = await lambdaHandler(event, {});
		expect(response.statusCode).toBe(500);
		expect(response.body).toBe("SessionConfigProcessor encoundered an error.");
	});
});
