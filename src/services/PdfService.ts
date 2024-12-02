import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { ServicesEnum } from "../models/enums/ServicesEnum";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { MessageCodes } from "../models/enums/MessageCodes";

import { PDFGenerationService } from "./pdfGenerationService";

export class PDFService {

  private static instance: PDFService;

  private readonly pdfGenerationService: PDFGenerationService;
  
  private readonly environmentVariables: EnvironmentVariables;

  private readonly logger: Logger;

  private readonly s3Client: S3Client;

  private constructor(logger: Logger) {
  	this.logger = logger;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.NA);
  	this.pdfGenerationService = PDFGenerationService.getInstance(this.logger);
  	this.s3Client = new S3Client({
  		region: process.env.REGION,
  		maxAttempts: 2,
  		requestHandler: new NodeHttpHandler({
  			connectionTimeout: 29000,
  			socketTimeout: 29000,
  		}),
  	});
	
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


  async processRequest(event: any): Promise<any> {
  	try {
  		const sessionId = event.sessionId;

  		const pdf = await this.pdfGenerationService.generatePDF(sessionId);

  		const bucket = this.environmentVariables.yotiLetterBucketName();
  		const folder = this.environmentVariables.yotiLetterBucketPDFFolder();
  		const key = `${folder}-${sessionId}`;

  		const uploadParams = {
  			Bucket: bucket,
  			Key: key,
  			Body: pdf,
  			ContentType: "application/pdf",
  		};

  		try {
  			this.logger.info("Uploading object with key ${key} to bucket ${bucket}");
  			await this.s3Client.send(new PutObjectCommand(uploadParams));
  		} catch (error) {
  			this.logger.error("Error uploading cover PDF to S3 bucket", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error uploading Yoti PDF to S3 bucket");
  		}

  		console.log("PDF processing completed successfully: ${pdf}");
  	} catch (error) {
  		console.error("Error processing PDF request:", error);
  		throw error;
  	}
  }
}
