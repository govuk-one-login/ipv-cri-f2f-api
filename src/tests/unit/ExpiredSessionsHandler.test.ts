import { lambdaHandler } from "../../ExpiredSessionsHandler";
import { mock } from "jest-mock-extended";
import { ExpiredSessionsProcessor } from "../../services/ExpiredSessionsProcessor";
import { CONTEXT } from "./data/context";
import { Response } from "../../utils/Response";

const mockedExpiredSessionsProcessor = mock<ExpiredSessionsProcessor>();

jest.mock("../../services/ExpiredSessionsProcessor", () => {
	return {
		ExpiredSessionsProcessor: jest.fn(() => mockedExpiredSessionsProcessor),
	};
});

describe("ExpiredSessionHandler", () => {
	it("return success response for ReminderEmail", async () => {
		ExpiredSessionsProcessor.getInstance = jest.fn().mockReturnValue(mockedExpiredSessionsProcessor);
		mockedExpiredSessionsProcessor.processRequest.mockResolvedValueOnce(Response(200, "Success"));

		const result = await lambdaHandler("", CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedExpiredSessionsProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(result.statusCode).toBe(200);
		expect(result.body).toBe("Success");
	});

	it("returns error if ExpiredSessionsProcessor fails", async () => {
		ExpiredSessionsProcessor.getInstance = jest.fn().mockReturnValue(mockedExpiredSessionsProcessor);
		mockedExpiredSessionsProcessor.processRequest.mockRejectedValueOnce(Response(500, "ERROR"));

		const result = await lambdaHandler("", CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedExpiredSessionsProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(result.statusCode).toBe(500);
		expect(result.body).toBe("Server Error");
	});
});
