import { lambdaHandler } from "../../ReminderEmailHandler";
import { mock } from "jest-mock-extended";
import { ReminderEmailProcessor } from "../../services/ReminderEmailProcessor";
import { CONTEXT } from "./data/context";
import { Response } from "../../utils/Response";

const mockedReminderEmailProcessor = mock<ReminderEmailProcessor>();

jest.mock("../../services/ReminderEmailProcessor", () => {
	return {
		ReminderEmailProcessor: jest.fn(() => mockedReminderEmailProcessor),
	};
});

describe("ReminderEmailHandler", () => {
	it("return success response for ReminderEmail", async () => {
		ReminderEmailProcessor.getInstance = jest.fn().mockReturnValue(mockedReminderEmailProcessor);
		mockedReminderEmailProcessor.processRequest.mockResolvedValueOnce(new Response(200, "Success"))

		const result = await lambdaHandler("", CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedReminderEmailProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(result.statusCode).toBe(200);
		expect(result.body).toBe("Success");
	});

	it("returns error if ReminderEmailProcessor fails", async () => {
		ReminderEmailProcessor.getInstance = jest.fn().mockReturnValue(mockedReminderEmailProcessor);
		mockedReminderEmailProcessor.processRequest.mockRejectedValueOnce(new Response(500, "ERROR"))

		const result = await lambdaHandler("", CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedReminderEmailProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(result.statusCode).toBe(500);
		expect(result.body).toBe("Server Error");
	});
});
