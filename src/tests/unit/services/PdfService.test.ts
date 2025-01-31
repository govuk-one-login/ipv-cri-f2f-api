/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";

import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { F2fService } from "../../../services/F2fService";
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

const logger = mock<Logger>();
const sessionId = "sessionId";

describe("PdfServiceTest", () => {
	beforeAll(() => {
		pdfServiceTest = PDFService.getInstance(logger);
		// @ts-ignore
		pdfServiceTest.pdfGenerationService = mockPdfGenerationService;
		// @ts-ignore
		pdfServiceTest.s3Client = mockS3Client;
	});

	describe("#processRequest", () => {
		

		it("Calls the pdf service and returns a constructed PDF", async () => {
			mockPdfGenerationService.generatePDF.mockResolvedValueOnce(Buffer.alloc(123));

			const response = await pdfServiceTest.createPdf(sessionId);
			
			expect(mockPdfGenerationService.generatePDF).toHaveBeenCalledTimes(1);
			expect(response).toEqual(Buffer.alloc(123));
		});
	});
});
