import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";

import { PDFGenerationService } from "./pdfGenerationService";

export class PDFService {

  private static instance: PDFService;

  private readonly pdfGenerationService: PDFGenerationService;
  
  private readonly logger: Logger;

  private readonly metrics: Metrics;


  private constructor(logger: Logger, metrics: Metrics) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.pdfGenerationService = PDFGenerationService.getInstance(this.logger);
	
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  ): PDFService {
  	if (!PDFService.instance) {
  		PDFService.instance = new PDFService(
  			logger, metrics,
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
  		this.logger.error("Error processing PDF request:" + error);
		
  		const singleMetric = this.metrics.singleMetric();
  		singleMetric.addDimension("error", "unable_to_create_cover_letter");
  		singleMetric.addMetric("GeneratePrintedLetter_error", MetricUnits.Count, 1);

  		throw error;
  	}
  }
}
