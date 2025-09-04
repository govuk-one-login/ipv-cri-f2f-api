import { lambdaHandler } from "../../UserInfoHandler";
import { mock } from "jest-mock-extended";
import { VALID_USERINFO } from "./data/userInfo-events";
import { UserInfoRequestProcessor } from "../../services/UserInfoRequestProcessor";

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

		 
		expect(mockedUserInfoRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
