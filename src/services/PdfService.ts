import { Logger } from "@aws-lambda-powertools/logger";

import { PDFGenerationService } from "./pdfGenerationService";

export class PDFService {

  private static instance: PDFService;

  private readonly pdfGenerationService: PDFGenerationService;
  
  private readonly logger: Logger;

  private constructor(logger: Logger) {
  	this.logger = logger;
  	this.pdfGenerationService = PDFGenerationService.getInstance(this.logger);
	
  }

  static getInstance(
  	logger: Logger,
  ): PDFService {
  	if (!PDFService.instance) {
  		PDFService.instance = new PDFService(
  			logger,
  		);
  	}
  	return PDFService.instance;
  }


  async createPdf(sessionId: string): Promise<any> {
  	try {
  		const pdf = await this.pdfGenerationService.generatePDF(sessionId);	
  		this.logger.info("PDF created successfully");
  		return pdf;
  	} catch (error) {
  		console.error("Error processing PDF request:", error);
  		throw error;
  	}
  }
}
