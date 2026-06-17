import type { MockInstance } from "vitest";
 
import { lambdaHandler, logger } from "../../GeneratePrintedLetterHandler";
import { GeneratePrintedLetterProcessor } from "../../services/GeneratePrintedLetterProcessor";
import { mock } from "vitest-mock-extended";
import { CONTEXT } from "./data/context";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";

const mockedGeneratePrintedLetterProcessor = mock<GeneratePrintedLetterProcessor>();

vi.mock("../../services/GenerateYotiLetterProcessor", () => {
	return {
		GeneratePrintedLetterProcessor: vi.fn(() => mockedGeneratePrintedLetterProcessor),
	};
});

vi.mock("../../utils/Config", () => ({
	getParameter: vi.fn(),
}));

describe("GeneratePrintedLetterHandler", () => {
	// Used for testing
	/* eslint-disable @typescript-eslint/no-unused-vars */
	let loggerSpy: MockInstance;
	let metricsSpy: MockInstance;

	beforeEach(() => {
		metricsSpy = vi.spyOn(Metrics.prototype, "addMetric");
		loggerSpy = vi.spyOn(logger, "error");
	});

	it("throws error if sessionId is missing from lambda event", async () => {

		GeneratePrintedLetterProcessor.getInstance = vi.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler(({ "sessionId":"", "pdfPreference":"POST" }), CONTEXT);

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: missing sessionId", messageCode: MessageCodes.MISSING_SESSION_ID });
		expect(metricsSpy).toHaveBeenCalledWith("GeneratePrintedLetter_error_generating_printed_letter", MetricUnit.Count, 1);

	});

	it("throws error if sessionId is malformed", async () => {

		GeneratePrintedLetterProcessor.getInstance = vi.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler(({ "sessionId":"abcdefgh", "pdfPreference":"POST" }), CONTEXT);

		expect(logger.error).toHaveBeenCalledWith({ message: "Invalid request: sessionId is not a valid uuid", messageCode: MessageCodes.INVALID_SESSION_ID });
		expect(metricsSpy).toHaveBeenCalledWith("GeneratePrintedLetter_error_generating_printed_letter", MetricUnit.Count, 1);
	});

	it("calls GenerateYotiLetterProcessor if required attributes are present", async () => {
		GeneratePrintedLetterProcessor.getInstance = vi.fn().mockReturnValue(mockedGeneratePrintedLetterProcessor);

		await lambdaHandler({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" }, CONTEXT);

		 
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedGeneratePrintedLetterProcessor.processRequest).toHaveBeenCalledWith({ "sessionId":"1b655a2e-44e4-4b21-a626-7825abd9c93e", "pdfPreference":"POST" });
	});
});
