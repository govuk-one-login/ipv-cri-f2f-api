import { lambdaHandler } from "../../UserInfoHandler";
import { mock } from "vitest-mock-extended";
import { VALID_USERINFO } from "./data/userInfo-events";
import { UserInfoRequestProcessor } from "../../services/UserInfoRequestProcessor";

const mockedUserInfoRequestProcessor = mock<UserInfoRequestProcessor>();

vi.mock("../../services/UserInfoRequestProcessor", () => {
	return {
		UserInfoRequestProcessor: vi.fn(() => mockedUserInfoRequestProcessor),
	};
});

describe("UserInfoHandler", () => {
	it("return success response for userInfo", async () => {
		UserInfoRequestProcessor.getInstance = vi.fn().mockReturnValue(mockedUserInfoRequestProcessor);

		await lambdaHandler(VALID_USERINFO, "CIC");

		 
		expect(mockedUserInfoRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
