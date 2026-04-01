import { mock } from "jest-mock-extended";
import { lambdaHandler, logger } from "../../PostOfficeVisitHandler";
import { PostOfficeVisitProcessor } from "../../services/PostOfficeVisitProcessor";
import { YotiPrivateKeyProvider } from "../../services/callback/YotiPrivateKeyProvider";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { VALID_FIRST_BRANCH_VISIT_EVENT, VALID_THANK_YOU_EMAIL_EVENT } from "./data/callback-events";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedPostOfficeVisitProcessor = mock<PostOfficeVisitProcessor>();
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "YOTI_PRIVATE_KEY";

describe("PostOfficeVisitHandler", () => {

	let loggerSpy: jest.SpyInstance;

	let successMessage = "Finished processing record from SQS"

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(PostOfficeVisitProcessor, "getInstance").mockReturnValue(mockedPostOfficeVisitProcessor);
		jest.spyOn(YotiPrivateKeyProvider, "getYotiPrivateKey").mockResolvedValue(YOTI_PRIVATE_KEY);
		loggerSpy = jest.spyOn(logger, "info");
	});

	afterEach(() => {
		jest.restoreAllMocks();
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
		jest.spyOn(PostOfficeVisitProcessor, "getInstance").mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "error");
		});

		await expect(lambdaHandler(VALID_THANK_YOU_EMAIL_EVENT, "F2F")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to process post office visit callback event",
		}));
	});
});
