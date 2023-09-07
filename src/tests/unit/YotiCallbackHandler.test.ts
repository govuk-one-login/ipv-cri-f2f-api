import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../YotiCallbackHandler";
import { CompletedSessionProcessor } from "../../services/CompletedSessionProcessor";
import { VALID_SQS_EVENT } from "./data/callback-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { failEntireBatch } from "../../utils/SqsBatchResponseHelper";

const mockedCompletedSessionProcessor = mock<CompletedSessionProcessor>();

jest.mock("../../services/CompletedSessionProcessor", () => {
	return {
		CompletedSessionProcessor: jest.fn(() => mockedCompletedSessionProcessor),
	};
});

jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => {return "dgsdgsg";}),
	};
});
describe("YotiCallbackHandler", () => {
	it("return success response for YotiCallback", async () => {
		CompletedSessionProcessor.getInstance = jest.fn().mockReturnValue(mockedCompletedSessionProcessor);
		await lambdaHandler(VALID_SQS_EVENT, "F2F");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedCompletedSessionProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("returns Bad request when number of records in the SQS message is more than 1", async () => {
		const event = { "Records": [] };
		const response = await lambdaHandler(event, "F2F");
		expect(response).toEqual(failEntireBatch);
	});

	it("errors when yoticallback processor throws AppError", async () => {
		CompletedSessionProcessor.getInstance = jest.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});
		const response = await lambdaHandler(VALID_SQS_EVENT, "F2F");
		expect(response).toEqual(failEntireBatch);
	});
});
