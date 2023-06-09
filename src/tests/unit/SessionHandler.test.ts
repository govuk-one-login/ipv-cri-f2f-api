import { lambdaHandler } from "../../SessionHandler";
import { mock } from "jest-mock-extended";
import { VALID_SESSION, RESOURCE_NOT_FOUND } from "./data/session-events";
import { SessionRequestProcessor } from "../../services/SessionRequestProcessor";
import { CONTEXT } from "./data/context";
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

		await lambdaHandler(VALID_SESSION, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedSessionRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("return not found when resource not found", async () => {
		SessionRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionRequestProcessor);

		expect(lambdaHandler(RESOURCE_NOT_FOUND, CONTEXT)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.NOT_FOUND,
		}));
	});
});
