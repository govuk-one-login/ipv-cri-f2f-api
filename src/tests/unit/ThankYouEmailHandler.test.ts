import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../ThankYouEmailHandler";
import { ThankYouEmailProcessor } from "../../services/ThankYouEmailProcessor";
import { VALID_THANK_YOU_EMAIL_EVENT } from "./data/callback-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";

const mockedThankYouEmailHandler = mock<ThankYouEmailProcessor>();

jest.mock("../../services/ThankYouEmailProcessor", () => {
	return {
		ThankYouEmailProcessor: jest.fn(() => mockedThankYouEmailHandler),
	};
});

jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => "dgsdgsg"),
	};
});
describe("ThankYouEmailHandler", () => {
	it("return success response when ThankYouEmailProcessor is successful", async () => {
		ThankYouEmailProcessor.getInstance = jest.fn().mockReturnValue(mockedThankYouEmailHandler);
		await lambdaHandler(JSON.stringify(VALID_THANK_YOU_EMAIL_EVENT), "F2F");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedThankYouEmailHandler.processRequest).toHaveBeenCalledTimes(1);
	});

	it("errors when ThankYouEmailProcessor throws AppError", async () => {
		ThankYouEmailProcessor.getInstance = jest.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});
		await expect(lambdaHandler(JSON.stringify(VALID_THANK_YOU_EMAIL_EVENT), "F2F")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to process thank_you_email_requested event",
		}));
	});
});
