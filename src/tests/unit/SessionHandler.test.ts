import { lambdaHandler } from "../../SessionHandler";
import { mock } from "vitest-mock-extended";
import { VALID_SESSION } from "./data/session-events";
import { SessionRequestProcessor } from "../../services/SessionRequestProcessor";
import { CONTEXT } from "./data/context";

const mockedSessionRequestProcessor = mock<SessionRequestProcessor>();

vi.mock("../../services/SessionRequestProcessor", () => {
	return {
		SessionRequestProcessor: vi.fn(() => mockedSessionRequestProcessor),
	};
});

describe("SessionHandler", () => {
	it("return success response for session", async () => {
		SessionRequestProcessor.getInstance = vi.fn().mockReturnValue(mockedSessionRequestProcessor);

		await lambdaHandler(VALID_SESSION, CONTEXT);

		 
		expect(mockedSessionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
