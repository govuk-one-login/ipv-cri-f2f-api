import { lambdaHandler } from "../../DocumentSelectionHandler";
import { mock } from "jest-mock-extended";
import { RESOURCE_NOT_FOUND, UNSUPPORTED_METHOD, VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/documentSelection-events";

import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "../../services/DocumentSelectionRequestProcessor";

const mockDocumentSelectionRequestProcessor = mock<DocumentSelectionRequestProcessor>();
jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "YOTIPRIVATEKEY";}),
	};
});

jest.mock("../../services/AuthorizationRequestProcessor", () => {
	return {
		DocumentSelectionRequestProcessor: jest.fn(() => mockDocumentSelectionRequestProcessor),
	};
});

describe("DocumentSelectionHandler", () => {
	it("return not found when resource not found", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.NOT_FOUND,
		}));
	});

	it("return not found when unsupported http method tried for documentSelection", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(UNSUPPORTED_METHOD, "")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return bad request if session id is missing", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(MISSING_SESSION_ID, "")).resolves.toEqual(new Response(HttpCodesEnum.BAD_REQUEST, "Missing header: session-id is required"));
	});

	it("return bad request if session id validation fails", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(INVALID_SESSION_ID, "")).resolves.toEqual(new Response(HttpCodesEnum.BAD_REQUEST, "Session id must be a valid uuid"));
	});

	it("return success for valid request", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		expect(mockDocumentSelectionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
