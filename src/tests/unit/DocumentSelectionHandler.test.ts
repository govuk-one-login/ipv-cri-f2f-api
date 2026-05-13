import type { MockInstance } from "vitest";
 
 
import { lambdaHandler, logger } from "../../DocumentSelectionHandler";
import { mock } from "vitest-mock-extended";
import { VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/documentSelection-events";

import { DocumentSelectionRequestProcessor } from "../../services/DocumentSelectionRequestProcessor";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockDocumentSelectionRequestProcessor = mock<DocumentSelectionRequestProcessor>();
vi.mock("../../utils/Config", () => {
	return {
		getParameter: vi.fn(() => {return "YOTIPRIVATEKEY";}),
	};
});

describe("DocumentSelectionHandler", () => {
	let loggerSpy: MockInstance;

	beforeEach(() => {
		loggerSpy = vi.spyOn(logger, "error");
	});	

	it("return Unauthorized when x-govuk-signin-session-id header is missing", async () => {
		const message = `Missing header: ${Constants.X_SESSION_ID} is required`;
		DocumentSelectionRequestProcessor.getInstance = vi.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);
		const response = await lambdaHandler(MISSING_SESSION_ID, "");

		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return Unauthorized when x-govuk-signin-session-id header is invalid", async () => {
		const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;
		DocumentSelectionRequestProcessor.getInstance = vi.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return success for valid request", async () => {
		DocumentSelectionRequestProcessor.getInstance = vi.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		expect(mockDocumentSelectionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
