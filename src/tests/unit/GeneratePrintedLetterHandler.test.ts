/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../GeneratePrintedLetterHandler";
import { GeneratePrintedLetterProcessor } from "../../services/GeneratePrintedLetterProcessor";
import { mock } from "jest-mock-extended";
import { CONTEXT } from "./data/context";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";

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
	// Used for testing
	/* eslint-disable @typescript-eslint/no-unused-vars */
	let loggerSpy: jest.SpyInstance;
	let metricsSpy: jest.SpyInstance;

	beforeEach(() => {
		metricsSpy = jest.spyOn(Metrics.prototype, "addMetric");
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("throws error if sessionId is missing from lambda event", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler(({ "sessionId":"", "pdfPreference":"POST" }), CONTEXT);

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing sessionId", messageCode: MessageCodes.MISSING_SESSION_ID });
		expect(metricsSpy).toHaveBeenCalledWith("GeneratePrintedLetter_error_generating_printed_letter", MetricUnits.Count, 1);

	});

	it("throws error if sessionId is malformed", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler(({ "sessionId":"abcdefgh", "pdfPreference":"POST" }), CONTEXT);

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: sessionId is not a valid uuid", messageCode: MessageCodes.INVALID_SESSION_ID });
		expect(metricsSpy).toHaveBeenCalledWith("GeneratePrintedLetter_error_generating_printed_letter", MetricUnits.Count, 1);
	});

	it("throws error if pdfPreference is missing from lambda event", async () => {

		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler(({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"" }), CONTEXT);

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing pdfPreference", messageCode: MessageCodes.MISSING_PCL_PREFERENCE });
		expect(metricsSpy).toHaveBeenCalledWith("GeneratePrintedLetter_error_generating_printed_letter", MetricUnits.Count, 1);
	});

	it("calls GenerateYotiLetterProcessor if required attributes are present", async () => {
		GeneratePrintedLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" }, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledWith({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" });
	});
});
