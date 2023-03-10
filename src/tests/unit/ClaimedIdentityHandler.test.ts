import { lambdaHandler } from "../../ClaimedIdentityHandler";
import { mock } from "jest-mock-extended";
import { VALID_CLAIMEDID, UNSUPPORTED_CLAIMEDID, RESOURCE_NOT_FOUND } from "./data/cic-events";
import { ClaimedIdRequestProcessor } from "../../services/ClaimedIdRequestProcessor";
import { Response } from "../../utils/Response";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";

const mockedClaimedIdRequestProcessor = mock<ClaimedIdRequestProcessor>();

jest.mock("../../services/ClaimedIdRequestProcessor", () => {
	return {
		ClaimedIdRequestProcessor: jest.fn(() => mockedClaimedIdRequestProcessor),
	};
});

describe("ClaimedIdentityHandler", () => {
	it("return success response for claimedidentity", async () => {
		ClaimedIdRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedClaimedIdRequestProcessor);

		await lambdaHandler(VALID_CLAIMEDID, "CIC");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedClaimedIdRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("return not found when unsupported http method tried for claimedidentity", async () => {
		ClaimedIdRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedClaimedIdRequestProcessor);

	     return expect(lambdaHandler(UNSUPPORTED_CLAIMEDID, "CIC")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return not found when resource not found", async () => {
		ClaimedIdRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedClaimedIdRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "CIC")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.NOT_FOUND,
		}));
	});
});
