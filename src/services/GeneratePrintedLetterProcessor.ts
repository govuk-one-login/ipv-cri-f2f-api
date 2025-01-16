import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ValidationHelper } from "../utils/ValidationHelper";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
const PDFMerger = require("pdf-merger-js");

export class GeneratePrintedLetterProcessor {

	private static instance: GeneratePrintedLetterProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private s3Client: S3Client;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;

	private readonly validationHelper: ValidationHelper;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GENERATE_PRINTED_LETTER_SERVICE);
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
		this.validationHelper = new ValidationHelper();
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
		metrics: Metrics,
	): GeneratePrintedLetterProcessor {
		if (!GeneratePrintedLetterProcessor.instance) {
			GeneratePrintedLetterProcessor.instance =
				new GeneratePrintedLetterProcessor(logger, metrics);
		}
		return GeneratePrintedLetterProcessor.instance;
	}

	async processRequest(event: any): Promise<any> {

  	const f2fSessionInfo = await this.f2fService.getSessionById(event.sessionId);
  	this.logger.appendKeys({
  		govuk_signin_journey_id: f2fSessionInfo?.clientSessionId,
  	});
	
  	if (!f2fSessionInfo) {
  		this.logger.error("Missing details in SESSION table", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
  	}

		const bucket = this.environmentVariables.yotiLetterBucketName();
		const folder = this.environmentVariables.yotiLetterBucketPDFFolder();
		const key = `${folder}-${f2fSessionInfo.yotiSessionId}`;
		let yotiPdfBuffer = null;
		let coverLetterPdfBuffer = null;
		let mergedPdfBuffer = null;

		// Retrieve Yoti PDF
		const downloadParams = {
			Bucket: bucket,
			Key: key, 
		};

		try {
			this.logger.info(`Retrieving object with key ${key} from bucket ${bucket}`);
			const yotiPdfdata = await this.s3Client.send(new GetObjectCommand(downloadParams));

			if (yotiPdfdata.Body) {
				const chunks = [];
				for await (const chunk of yotiPdfdata.Body as AsyncIterable<Uint8Array>) {
				  chunks.push(chunk);
				}
				yotiPdfBuffer = Buffer.concat(chunks);
			
				this.logger.info("Yoti PDF file downloaded successfully."); 
			  } else {
				this.logger.error("Error: No data found in the response.");
			  }
		} catch (error) {
			this.logger.error("Error retrieving Yoti PDF from S3 bucket", { messageCode: MessageCodes.FAILED_YOTI_GET_INSTRUCTIONS });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Yoti PDF from S3 bucket");
		}

		// Retrieve Cover Letter PDF - This will be replaced with the code to dynamically generate the cover letter
		const downloadParams2 = {
			Bucket: bucket,
			Key: "coverLetterPdf", 
		};

		try {
			this.logger.info(`Retrieving object with key coverLetterPdf from bucket ${bucket}`);
			const coverLetterData = await this.s3Client.send(new GetObjectCommand(downloadParams2));

			if (coverLetterData.Body) {
				const chunks = [];
				for await (const chunk of coverLetterData.Body as AsyncIterable<Uint8Array>) {
				  chunks.push(chunk);
				}
				coverLetterPdfBuffer = Buffer.concat(chunks);
			
				this.logger.info("Cover letter PDF file downloaded successfully."); 
			  } else {
				this.logger.error("Error: No data found in the response.");
			  }
		} catch (error) {
			this.logger.error("Error retrieving Cover Letter PDF from S3 bucket", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Cover Letter PDF from S3 bucket");
		}

		// Merge retrieved PDF's
		try {
			this.logger.info("Attempting to merge PDF's"); 
			const merger = new PDFMerger();
			await merger.add(coverLetterPdfBuffer);
			await merger.add(yotiPdfBuffer);
			mergedPdfBuffer = await merger.saveAsBuffer(); 
			this.logger.info("PDF's merged succesfully"); 
		} catch (error) {
			this.logger.error("Error merging PDFs", { messageCode: MessageCodes.FAILED_PDF_MERGE });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error merging PDFs");
		}

		// Upload merged PDF
		const uploadParams = {
			Bucket: bucket,
			Key: `${folder}-merged-${f2fSessionInfo.yotiSessionId}`,
			Body: mergedPdfBuffer,
			ContentType: "application/octet-stream",
		};
		try {
			this.logger.info(`Uploading merged PDF: ${uploadParams.Key}`);
			const coverLetterData = await this.s3Client.send(new PutObjectCommand(uploadParams));
		} catch (error) {
			this.logger.error("Error uploading merged PDF", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error uploading merged PDF");
		}

		return {
			sessionId: event.sessionId,
			pdf_preference: event.pdf_preference,
		};

	}
}
