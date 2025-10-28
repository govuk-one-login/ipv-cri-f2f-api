 
import { lambdaHandler, logger } from "../../GenerateYotiLetterHandler";
import { GenerateYotiLetterProcessor } from "../../services/GenerateYotiLetterProcessor";
import { mock } from "jest-mock-extended";
import { CONTEXT } from "./data/context";
import { getParameter } from "../../utils/Config";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedGenerateYotiLetterProcessor = mock<GenerateYotiLetterProcessor>();

jest.mock("../../services/GenerateYotiLetterProcessor", () => {
	return {
		GenerateYotiLetterProcessor: jest.fn(() => mockedGenerateYotiLetterProcessor),
	};
});

jest.mock("../../utils/Config", () => ({
	getParameter: jest.fn(),
}));


describe("GenerateYotiLetterHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("throws error if sessionId is missing from lambda event", async () => {

		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"", "pdfPreference":"POST" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing sessionId", messageCode: MessageCodes.MISSING_SESSION_ID });
	});

	it("throws error if sessionId is malformed", async () => {

		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"abcdefgh", "pdfPreference":"POST" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: sessionId is not a valid uuid", messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("throws error if pdfPreference is missing from lambda event", async () => {

		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing pdfPreference", messageCode: MessageCodes.MISSING_PCL_PREFERENCE });
	});

	it("fails to call GenerateYotiLetterProcessor if there is an error retrieving Yoti SSM key", async () => {
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);
		(getParameter as jest.Mock).mockRejectedValueOnce("Error");
		
		const result = await lambdaHandler({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" }, CONTEXT);

		expect(loggerSpy).toHaveBeenCalledWith({
			message: "Error fetching Yoti private key",
			error: "Error",
			messageCode: MessageCodes.SERVER_ERROR,
		});
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledTimes(0);
		expect(result.statusCode).toBe(500);

	});

	it("calls GenerateYotiLetterProcessor if Yoti SSM key is present", async () => {
		const key = "YOTI/PRIVATE_KEY";
		(getParameter as jest.Mock).mockResolvedValueOnce(key);
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);

		await lambdaHandler({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" }, CONTEXT);

		 
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledWith({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" });
	});
});
