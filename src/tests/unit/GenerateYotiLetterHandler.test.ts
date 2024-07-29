/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/unbound-method */
import { mock } from "jest-mock-extended";
import { lambdaHandler, logger } from "../../AbortHandler";
import { GenerateYotiLetterProcessor } from "../../services/GenerateYotiLetterProcessor";
import { VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/abort-events";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockGenerateYotiLetterProcessor = mock<GenerateYotiLetterProcessor>();

describe("AbortHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("return Unauthorized when x-govuk-signin-session-id header is missing", async () => {
		const message = `Missing header: ${Constants.X_SESSION_ID} is required`;
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockGenerateYotiLetterProcessor);
		const response = await lambdaHandler(MISSING_SESSION_ID, "");

		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return Unauthorized when x-govuk-signin-session-id header is invalid", async () => {
		const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockGenerateYotiLetterProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return success for valid request", async () => {
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockGenerateYotiLetterProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		expect(mockGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
