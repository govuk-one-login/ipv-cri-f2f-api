import { lambdaHandler } from "../../AuthorizationCodeHandler";
import { mock } from "vitest-mock-extended";
import { VALID_AUTHCODE } from "./data/auth-events";

import { AuthorizationRequestProcessor } from "../../services/AuthorizationRequestProcessor";

const mockedAuthorizationRequestProcessor = mock<AuthorizationRequestProcessor>();

vi.mock("../../services/AuthorizationRequestProcessor", () => {
	return {
		AuthorizationRequestProcessor: vi.fn(() => mockedAuthorizationRequestProcessor),
	};
});

describe("AuthorizationCodeHandler", () => {
	it("return success response for AuthorizationCode", async () => {
		AuthorizationRequestProcessor.getInstance = vi.fn().mockReturnValue(mockedAuthorizationRequestProcessor);

		await lambdaHandler(VALID_AUTHCODE, "AUTH_CODE");

		 
		expect(mockedAuthorizationRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
