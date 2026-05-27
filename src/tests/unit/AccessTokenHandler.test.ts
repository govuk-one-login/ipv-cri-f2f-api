import { mock } from "vitest-mock-extended";
import { AccessTokenRequestProcessor } from "../../services/AccessTokenRequestProcessor";
import { lambdaHandler } from "../../AccessTokenHandler";
import { VALID_ACCESSTOKEN } from "./data/accessToken-events";

const mockedAccessTokenRequestProcessor = mock<AccessTokenRequestProcessor>();

vi.mock("../../services/AccessTokenRequestProcessor", () => {
	return {
		AccessTokenRequestProcessor: vi.fn(() => mockedAccessTokenRequestProcessor),
	};
});

describe("AccessTokenHandler", () => {
	it("return success response for accessToken", async () => {
		AccessTokenRequestProcessor.getInstance = vi.fn().mockReturnValue(mockedAccessTokenRequestProcessor);

		await lambdaHandler(VALID_ACCESSTOKEN, "F2F");

		 
		expect(mockedAccessTokenRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
