import type { MockInstance } from "vitest";
import { mock } from "vitest-mock-extended";
import { lambdaHandler, logger } from "../../PostOfficeVisitHandler";
import { PostOfficeVisitProcessor } from "../../services/PostOfficeVisitProcessor";
import { YotiPrivateKeyProvider } from "../../services/callback/YotiPrivateKeyProvider";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { VALID_FIRST_BRANCH_VISIT_EVENT, VALID_THANK_YOU_EMAIL_EVENT } from "./data/callback-events";

const mockedPostOfficeVisitProcessor = mock<PostOfficeVisitProcessor>();
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "YOTI_PRIVATE_KEY";

describe("PostOfficeVisitHandler", () => {

	let loggerSpy: MockInstance;

	let successMessage = "Finished processing record from SQS"

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(PostOfficeVisitProcessor, "getInstance").mockReturnValue(mockedPostOfficeVisitProcessor);
		vi.spyOn(YotiPrivateKeyProvider, "getYotiPrivateKey").mockResolvedValue(YOTI_PRIVATE_KEY);
		loggerSpy = vi.spyOn(logger, "info");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("it succesfully processes thank you email topic and retrieves yoti key", async () => {
		await lambdaHandler(VALID_THANK_YOU_EMAIL_EVENT, "F2F");
		expect(mockedPostOfficeVisitProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(YotiPrivateKeyProvider.getYotiPrivateKey).toHaveBeenCalledTimes(1);
		expect(loggerSpy).toHaveBeenCalledWith(successMessage);
	});

	it("it succesfully processes first branch visit topic and does not retrieve yoti key", async () => {
		await lambdaHandler(VALID_FIRST_BRANCH_VISIT_EVENT, "F2F");
		expect(mockedPostOfficeVisitProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(YotiPrivateKeyProvider.getYotiPrivateKey).not.toHaveBeenCalled();
		expect(loggerSpy).toHaveBeenCalledWith(successMessage);
	});

	it("errors when PostOfficeVisitProcessor throws AppError", async () => {
		vi.spyOn(PostOfficeVisitProcessor, "getInstance").mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "error");
		});

		await expect(lambdaHandler(VALID_THANK_YOU_EMAIL_EVENT, "F2F")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to process post office visit callback event",
		}));
	});
});
