 
 
import { lambdaHandler, logger } from "../../DocumentSelectionHandler";
import { mock } from "jest-mock-extended";
import { VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/documentSelection-events";

import { DocumentSelectionRequestProcessor } from "../../services/DocumentSelectionRequestProcessor";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockDocumentSelectionRequestProcessor = mock<DocumentSelectionRequestProcessor>();
jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "YOTIPRIVATEKEY";}),
	};
});

describe("DocumentSelectionHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});	

	it("return Unauthorized when x-govuk-signin-session-id header is missing", async () => {
		const message = `Missing header: ${Constants.X_SESSION_ID} is required`;
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);
		const response = await lambdaHandler(MISSING_SESSION_ID, "");

		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return Unauthorized when x-govuk-signin-session-id header is invalid", async () => {
		const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response.statusCode).toBe(401);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return success for valid request", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		expect(mockDocumentSelectionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
