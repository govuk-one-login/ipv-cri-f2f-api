import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../PostOfficeVisitHandler";
import { PostOfficeVisitProcessor } from "../../services/PostOfficeVisitProcessor";
import { YotiPrivateKeyProvider } from "../../services/callback/YotiPrivateKeyProvider";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { VALID_FIRST_BRANCH_VISIT_EVENT, VALID_THANK_YOU_EMAIL_EVENT } from "./data/callback-events";

const mockedPostOfficeVisitProcessor = mock<PostOfficeVisitProcessor>();
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "YOTI_PRIVATE_KEY";

describe("PostOfficeVisitHandler", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(PostOfficeVisitProcessor, "getInstance").mockReturnValue(mockedPostOfficeVisitProcessor);
		jest.spyOn(YotiPrivateKeyProvider, "getYotiPrivateKey").mockResolvedValue(YOTI_PRIVATE_KEY);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("returns success response when PostOfficeVisitProcessor is successful", async () => {
		await lambdaHandler(VALID_THANK_YOU_EMAIL_EVENT, "F2F");
		expect(mockedPostOfficeVisitProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(YotiPrivateKeyProvider.getYotiPrivateKey).toHaveBeenCalledTimes(1);
	});

	it("processes first_branch_visit using PostOfficeVisitProcessor", async () => {
		await lambdaHandler(VALID_FIRST_BRANCH_VISIT_EVENT, "F2F");
		expect(mockedPostOfficeVisitProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(YotiPrivateKeyProvider.getYotiPrivateKey).not.toHaveBeenCalled();
	});

	it("errors when PostOfficeVisitProcessor throws AppError", async () => {
		jest.spyOn(PostOfficeVisitProcessor, "getInstance").mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send VC");
		});

		await expect(lambdaHandler(VALID_THANK_YOU_EMAIL_EVENT, "F2F")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to process post office visit callback event",
		}));
	});
});
