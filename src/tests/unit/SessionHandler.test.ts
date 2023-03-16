import { lambdaHandler } from "../../DocumentSelectorHandler";
import { mock } from "jest-mock-extended";
import { VALID_SESSION, UNSUPPORTED_CLAIMEDID, RESOURCE_NOT_FOUND } from "./data/events";
import { SessionRequestProcessor } from "../../services/DocumentSelectorProcessor";
import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

const mockedSessionRequestProcessor = mock<SessionRequestProcessor>();

jest.mock("../../services/SessionRequestProcessor", () => {
	return {
		SessionRequestProcessor: jest.fn(() => mockedSessionRequestProcessor),
	};
});

describe("SessionHandler", () => {
	it("return success response for session", async () => {
		SessionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionRequestProcessor);

		await lambdaHandler(VALID_SESSION, "CIC");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedSessionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
