 
 
import { mock } from "jest-mock-extended";
import { lambdaHandler, logger } from "../../AbortHandler";
import { AbortRequestProcessor } from "../../services/AbortRequestProcessor";
import { VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/abort-events";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockAbortRequestProcessor = mock<AbortRequestProcessor>();

describe("AbortHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("return Unauthorized when x-govuk-signin-session-id header is missing", async () => {
		const message = `Missing header: ${Constants.X_SESSION_ID} is required`;
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);
		const response = await lambdaHandler(MISSING_SESSION_ID, "");

		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return Unauthorized when x-govuk-signin-session-id header is invalid", async () => {
		const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return success for valid request", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		expect(mockAbortRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
