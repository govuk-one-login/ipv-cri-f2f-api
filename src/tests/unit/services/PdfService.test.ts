 
 
import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";

import { PDFService } from "../../../services/PdfService";
import { S3Client } from "@aws-sdk/client-s3";
import { PDFGenerationService } from "../../../services/pdfGenerationService";

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

const mockS3Client = mock<S3Client>();

let pdfServiceTest: PDFService;
const mockPdfGenerationService = mock<PDFGenerationService>();

const metrics = mock<Metrics>();
const logger = mock<Logger>();
const sessionId = "sessionId";

describe("PdfServiceTest", () => {
	beforeAll(() => {
		pdfServiceTest = PDFService.getInstance(logger, metrics);
		// @ts-expect-error linting to be updated
		pdfServiceTest.pdfGenerationService = mockPdfGenerationService;
		// @ts-expect-error linting to be updated
		pdfServiceTest.s3Client = mockS3Client;

		metrics.singleMetric.mockReturnValue(metrics);
	});

	describe("#processRequest", () => {
		

		it("Calls the pdf service and returns a constructed PDF", async () => {
			mockPdfGenerationService.generatePDF.mockResolvedValueOnce(Buffer.alloc(123));

			const response = await pdfServiceTest.createPdf(sessionId);
			
			expect(mockPdfGenerationService.generatePDF).toHaveBeenCalledTimes(1);
			expect(response).toEqual(Buffer.alloc(123));
		});

		it("Calls the pdf service and throws an error when generating pdf", async () => {
			mockPdfGenerationService.generatePDF.mockImplementation(() => {
				throw new Error();
			});
			try {
				await pdfServiceTest.createPdf(sessionId);
				// ignored so as not log PII
				/* eslint-disable @typescript-eslint/no-unused-vars */
			} catch (error:any) {
				
				expect(mockPdfGenerationService.generatePDF).toHaveBeenCalledTimes(1);
				
				expect(metrics.addDimension).toHaveBeenCalledWith("error", "unable_to_create_cover_letter");
				
				expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GeneratePrintedLetter_error", MetricUnits.Count, 1);
			}
		});
	});
});
