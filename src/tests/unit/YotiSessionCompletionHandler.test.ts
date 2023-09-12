import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../YotiSessionCompletionHandler";
import { YotiSessionCompletionProcessor } from "../../services/YotiSessionCompletionProcessor";
import { VALID_SESSION_COMPLETION_EVENT } from "./data/callback-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { failEntireBatch } from "../../utils/SqsBatchResponseHelper";

const mockedYotiSessionCompletionProcessor = mock<YotiSessionCompletionProcessor>();

jest.mock("../../services/YotiSessionCompletionProcessor", () => {
	return {
		YotiSessionCompletionProcessor: jest.fn(() => mockedYotiSessionCompletionProcessor),
	};
});

jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "dgsdgsg";}),
	};
});
describe("YotiSessionCompletionHandler", () => {
	it("return success response for YotiCallback", async () => {
		YotiSessionCompletionProcessor.getInstance = jest.fn().mockReturnValue(mockedYotiSessionCompletionProcessor);
		await lambdaHandler(JSON.stringify(VALID_SESSION_COMPLETION_EVENT), "F2F");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedYotiSessionCompletionProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("errors when YotiSessionCompletionProcessor throws AppError", async () => {
		YotiSessionCompletionProcessor.getInstance = jest.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});
		const response = await lambdaHandler(JSON.stringify(VALID_SESSION_COMPLETION_EVENT), "F2F");
		expect(response).toEqual(failEntireBatch);
	});
});
