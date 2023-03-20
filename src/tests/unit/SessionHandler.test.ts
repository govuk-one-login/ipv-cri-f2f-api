import { lambdaHandler } from "../../DocumentSelectorHandler";
import { mock } from "jest-mock-extended";
import { VALID_SESSION, UNSUPPORTED_CLAIMEDID, RESOURCE_NOT_FOUND } from "./data/events";
import { DocumentSelectorProcessor } from "../../services/DocumentSelectorProcessor";
import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

const mockedDocumentSelectorProcessor = mock<DocumentSelectorProcessor>();

jest.mock("../../services/DocumentSelectorProcessor", () => {
	return {
		DocumentSelectorProcessor: jest.fn(() => mockedDocumentSelectorProcessor),
	};
});

describe("SessionHandler", () => {
	it("return success response for session", async () => {
		DocumentSelectorProcessor.getInstance = jest.fn().mockReturnValue(mockedDocumentSelectorProcessor);

		await lambdaHandler(VALID_SESSION, "CIC");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedDocumentSelectorProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
