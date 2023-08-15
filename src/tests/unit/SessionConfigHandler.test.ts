import { lambdaHandler } from "../../SessionConfigHandler";
import { mock } from "jest-mock-extended";
import { RESOURCE_NOT_FOUND, UNSUPPORTED_SESSION_CONFIG, VALID_SESSION_CONFIG } from "./data/session-config-events";

import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { SessionConfigRequestProcessor } from "../../services/SessionConfigRequestProcessor";

const mockedSessionConfigRequestProcessor = mock<SessionConfigRequestProcessor>();

jest.mock("../../services/SessionConfigRequestProcessor", () => {
	return {
		SessionConfigRequestProcessor: jest.fn(() => mockedSessionConfigRequestProcessor),
	};
});

describe("SessionConfigHandler", () => {
	it("return success response for AuthorizationCode", async () => {
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionConfigRequestProcessor);

		await lambdaHandler(VALID_SESSION_CONFIG, "SESSION_CONFIG");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedSessionConfigRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("return not found when unsupported http method tried for sessionConfiguration", async () => {
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionConfigRequestProcessor);

		return expect(lambdaHandler(UNSUPPORTED_SESSION_CONFIG, "F2F")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return not found when resource not found", async () => {
		SessionConfigRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedSessionConfigRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "SESSION_CONFIG")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});
});
