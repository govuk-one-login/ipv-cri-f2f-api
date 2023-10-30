import { lambdaHandler } from "../../AuthorizationCodeHandler";
import { mock } from "jest-mock-extended";
import { RESOURCE_NOT_FOUND, UNSUPPORTED_AUTHCODE, VALID_AUTHCODE } from "./data/auth-events";

import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AuthorizationRequestProcessor } from "../../services/AuthorizationRequestProcessor";

const mockedAuthorizationRequestProcessor = mock<AuthorizationRequestProcessor>();

jest.mock("../../services/AuthorizationRequestProcessor", () => {
	return {
		AuthorizationRequestProcessor: jest.fn(() => mockedAuthorizationRequestProcessor),
	};
});

describe("AuthorizationCodeHandler", () => {
	it("return success response for AuthorizationCode", async () => {
		AuthorizationRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedAuthorizationRequestProcessor);

		await lambdaHandler(VALID_AUTHCODE, "AUTH_CODE");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedAuthorizationRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
