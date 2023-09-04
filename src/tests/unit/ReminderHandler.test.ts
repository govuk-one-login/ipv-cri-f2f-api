import { lambdaHandler } from "../../ReminderEmailHandler";
import { mock } from "jest-mock-extended";
import { ReminderEmailProcessor } from "../../services/ReminderEmailProcessor";
import { CONTEXT } from "./data/context";

const mockedReminderEmailProcessor = mock<ReminderEmailProcessor>();

jest.mock("../../services/ReminderEmailProcessor", () => {
	return {
		ReminderEmailProcessor: jest.fn(() => mockedReminderEmailProcessor),
	};
});

describe("ReminderEmailHandler", () => {
	it("return success response for ReminderEmail", async () => {
		ReminderEmailProcessor.getInstance = jest.fn().mockReturnValue(mockedReminderEmailProcessor);

		await lambdaHandler("", CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedReminderEmailProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
