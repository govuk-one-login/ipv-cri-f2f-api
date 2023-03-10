import { mock } from "jest-mock-extended";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AccessTokenRequestProcessor } from "../../services/AccessTokenRequestProcessor";
import { lambdaHandler } from "../../AccessTokenHandler";
import { RESOURCE_NOT_FOUND, VALID_ACCESSTOKEN } from "./data/accessToken-events";

const mockedAccessTokenRequestProcessor = mock<AccessTokenRequestProcessor>();

jest.mock("../../services/AccessTokenRequestProcessor", () => {
	return {
		AccessTokenRequestProcessor: jest.fn(() => mockedAccessTokenRequestProcessor),
	};
});

describe("AccessTokenHandler", () => {
	it("return success response for accessToken", async () => {
		AccessTokenRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedAccessTokenRequestProcessor);

		await lambdaHandler(VALID_ACCESSTOKEN, "CIC");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedAccessTokenRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("return not found when resource not found", async () => {
		AccessTokenRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedAccessTokenRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "CIC")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.NOT_FOUND,
		}));
	});
});
