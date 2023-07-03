import { lambdaHandler } from "../../DocumentSelectionHandler";
import { mock } from "jest-mock-extended";
import { RESOURCE_NOT_FOUND, UNSUPPORTED_METHOD, VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/documentSelection-events";

import { Response, SECURITY_HEADERS } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "../../services/DocumentSelectionRequestProcessor";

const mockDocumentSelectionRequestProcessor = mock<DocumentSelectionRequestProcessor>();
jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "YOTIPRIVATEKEY";}),
	};
});

describe("DocumentSelectionHandler", () => {
	it("return not found when resource not found", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return not found when unsupported http method tried for documentSelection", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(UNSUPPORTED_METHOD, "")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return Unauthorized if session id is missing", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		return expect(lambdaHandler(MISSING_SESSION_ID, "")).resolves.toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return Unauthorized if session id validation fails", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response).toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return success for valid request", async () => {
		DocumentSelectionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockDocumentSelectionRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockDocumentSelectionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
