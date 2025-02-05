/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../GeneratePrintedLetterHandler";
import { GeneratePrintedLetterProcessor } from "../../services/GeneratePrintedLetterProcessor";
import { mock } from "jest-mock-extended";
import { CONTEXT } from "./data/context";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedGeneratePrintedLetterProcessor = mock<GeneratePrintedLetterProcessor>();

jest.mock("../../services/GenerateYotiLetterProcessor", () => {
	return {
		GeneratePrintedLetterProcessor: jest.fn(() => mockedGeneratePrintedLetterProcessor),
	};
});

jest.mock("../../utils/Config", () => ({
	getParameter: jest.fn(),
}));

describe("GeneratePrintedLetterHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("throws error if sessionId is missing from lambda event", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"", "pdfPreference":"POST" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing sessionId", messageCode: MessageCodes.MISSING_SESSION_ID });
	});

	it("throws error if sessionId is malformed", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"abcdefgh", "pdfPreference":"POST" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: sessionId is not a valid uuid", messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("throws error if pdfPreference is missing from lambda event", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await expect(lambdaHandler(({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"" }), CONTEXT)).rejects.toThrow();

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing pdfPreference", messageCode: MessageCodes.MISSING_PCL_PREFERENCE });
	});

	it("calls GenerateYotiLetterProcessor if required attributes are present", async () => {
		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" }, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledWith({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" });
	});
});
