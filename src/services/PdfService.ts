import { logger } from "@govuk-one-login/cri-logger";
import { captureMetricWithDimensions } from "@govuk-one-login/cri-metrics";

import { PDFGenerationService } from "./pdfGenerationService";

export class PDFService {

  private static instance: PDFService;

  private readonly pdfGenerationService: PDFGenerationService;


  private constructor() {
  	this.pdfGenerationService = PDFGenerationService.getInstance();
  }

  static getInstance(): PDFService {
  	if (!PDFService.instance) {
  		PDFService.instance = new PDFService();
  	}
  	return PDFService.instance;
  }


  async createPdf(sessionId: string): Promise<any> {
  	try {
  		const pdf = await this.pdfGenerationService.generatePDF(sessionId);	
  		logger.info("PDF created successfully");
  		return pdf;
  	} catch (error) {
  		logger.error("Error processing PDF request:" + error);
  		captureMetricWithDimensions("GeneratePrintedLetter_error", { "error": "unable_to_create_cover_letter" });

  		throw error;
  	}
  }
}
