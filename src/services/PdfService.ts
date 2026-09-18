import { logger } from "@govuk-one-login/cri-logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";

import { PDFGenerationService } from "./pdfGenerationService";

export class PDFService {

  private static instance: PDFService;

  private readonly pdfGenerationService: PDFGenerationService;
  
  private readonly metrics: Metrics;


  private constructor(metrics: Metrics) {
  	this.metrics = metrics;
  	this.pdfGenerationService = PDFGenerationService.getInstance(this.metrics);
	
  }

  static getInstance(
  	metrics: Metrics,
  ): PDFService {
  	if (!PDFService.instance) {
  		PDFService.instance = new PDFService(
  			metrics,
  		);
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
		
  		const singleMetric = this.metrics.singleMetric();
  		singleMetric.addDimension("error", "unable_to_create_cover_letter");
  		singleMetric.addMetric("GeneratePrintedLetter_error", MetricUnit.Count, 1);

  		throw error;
  	}
  }
}
