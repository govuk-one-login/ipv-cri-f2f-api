import { lambdaHandler } from "../../UserInfoHandler";
import { mock } from "jest-mock-extended";
import { VALID_USERINFO, RESOURCE_NOT_FOUND } from "./data/userInfo-events";
import { UserInfoRequestProcessor } from "../../services/UserInfoRequestProcessor";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { CONTEXT } from "./data/context";
import { Response } from "../../utils/Response";

const mockedUserInfoRequestProcessor = mock<UserInfoRequestProcessor>();

jest.mock("../../services/UserInfoRequestProcessor", () => {
	return {
		UserInfoRequestProcessor: jest.fn(() => mockedUserInfoRequestProcessor),
	};
});

describe("UserInfoHandler", () => {
	it("return success response for userInfo", async () => {
		UserInfoRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedUserInfoRequestProcessor);

		await lambdaHandler(VALID_USERINFO, "CIC");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedUserInfoRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
