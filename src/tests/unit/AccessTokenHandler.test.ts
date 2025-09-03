import { mock } from "jest-mock-extended";
import { AccessTokenRequestProcessor } from "../../services/AccessTokenRequestProcessor";
import { lambdaHandler } from "../../AccessTokenHandler";
import { VALID_ACCESSTOKEN } from "./data/accessToken-events";

const mockedAccessTokenRequestProcessor = mock<AccessTokenRequestProcessor>();

jest.mock("../../services/AccessTokenRequestProcessor", () => {
	return {
		AccessTokenRequestProcessor: jest.fn(() => mockedAccessTokenRequestProcessor),
	};
});

describe("AccessTokenHandler", () => {
	it("return success response for accessToken", async () => {
		AccessTokenRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedAccessTokenRequestProcessor);

		await lambdaHandler(VALID_ACCESSTOKEN, "F2F");

		 
		expect(mockedAccessTokenRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
