import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../YotiCallbackHandler";
import { YotiCallbackProcessor } from "../../services/YotiCallbackProcessor";
import { VALID_SQS_EVENT } from "./data/callback-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import {failEntireBatch} from "../../utils/SqsBatchResponseHelper";

const mockedYotiCallbackProcessor = mock<YotiCallbackProcessor>();

jest.mock("../../services/YotiCallbackProcessor", () => {
	return {
		YotiCallbackProcessor: jest.fn(() => mockedYotiCallbackProcessor),
	};
});

jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "dgsdgsg";}),
	};
});
describe("YotiCallbackHandler", () => {
	it("return success response for YotiCallback", async () => {
		YotiCallbackProcessor.getInstance = jest.fn().mockReturnValue(mockedYotiCallbackProcessor);
		await lambdaHandler(VALID_SQS_EVENT, "F2F");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedYotiCallbackProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("returns Bad request when number of records in the SQS message is more than 1", async () => {
		const event = { "Records": [] };
		const response = await lambdaHandler(event, "F2F");
		expect(response).toEqual(failEntireBatch);
	});

	it("errors when yoticallback processor throws AppError", async () => {
		YotiCallbackProcessor.getInstance = jest.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});
		const response = await lambdaHandler(VALID_SQS_EVENT, "F2F");
		expect(response).toEqual(failEntireBatch);
	});
});
