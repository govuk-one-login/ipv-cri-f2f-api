import { mock } from "vitest-mock-extended";
import { lambdaHandler } from "../../YotiSessionCompletionHandler";
import { YotiSessionCompletionProcessor } from "../../services/YotiSessionCompletionProcessor";
import { VALID_SESSION_COMPLETION_EVENT } from "./data/callback-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";

const mockedYotiSessionCompletionProcessor = mock<YotiSessionCompletionProcessor>();

vi.mock("../../services/YotiSessionCompletionProcessor", () => {
	return {
		YotiSessionCompletionProcessor: vi.fn(() => mockedYotiSessionCompletionProcessor),
	};
});

vi.mock("../../utils/Config", () => {
	return {
		getParameter: vi.fn(() => "dgsdgsg"),
	};
});

describe("YotiSessionCompletionHandler", () => {
	it("return success response for YotiCallback", async () => {
		YotiSessionCompletionProcessor.getInstance = vi.fn().mockReturnValue(mockedYotiSessionCompletionProcessor);
		await lambdaHandler(VALID_SESSION_COMPLETION_EVENT, "F2F");

		 
		expect(mockedYotiSessionCompletionProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("errors when YotiSessionCompletionProcessor throws AppError", async () => {
		YotiSessionCompletionProcessor.getInstance = vi.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});
		await expect(lambdaHandler(VALID_SESSION_COMPLETION_EVENT, "F2F")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to process session_completion event",
		}));
	});
});
