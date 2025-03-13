import { lambdaHandler } from "../../SessionHandler";
import { mock } from "jest-mock-extended";
import { VALID_SESSION } from "./data/session-events";
import { SessionRequestProcessor } from "../../services/SessionRequestProcessor";
import { CONTEXT } from "./data/context";

const mockedSessionRequestProcessor = mock<SessionRequestProcessor>();

jest.mock("../../services/SessionRequestProcessor", () => {
	return {
		SessionRequestProcessor: jest.fn(() => mockedSessionRequestProcessor),
	};
});

describe("SessionHandler", () => {
	it("return success response for session", async () => {
		SessionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionRequestProcessor);

		await lambdaHandler(VALID_SESSION, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedSessionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
