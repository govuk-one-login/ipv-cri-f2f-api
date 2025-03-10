import { F2fService } from "./F2fService";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";

import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import PDFMerger from "pdf-merger-js";
import { PDFService } from "./PdfService";
import { PDFDocument } from "pdf-lib";

export class GeneratePrintedLetterProcessor {

	private static instance: GeneratePrintedLetterProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;

	private readonly pdfService: PDFService;

	private s3Client: S3Client;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GENERATE_PRINTED_LETTER_SERVICE);
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
		this.pdfService = PDFService.getInstance(logger, metrics);
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
		const yotiPdfFolder = this.environmentVariables.yotiLetterBucketPDFFolder();

		const mergedLetterFolder = this.environmentVariables.mergedLetterBucketPDFFolder();

		const yotiInstructionskey = `${yotiPdfFolder}-${f2fSessionInfo.yotiSessionId}`;
		const mergedLetterKey = `${mergedLetterFolder}-${f2fSessionInfo.yotiSessionId}`;

		let yotiPdfBuffer = null;
		let mergedPdfBuffer = null;

		// Retrieve Yoti PDF
		const yotiPdfSearchParams = {
			Bucket: bucket,
			Key: yotiInstructionskey, 
		};

		try {
			this.logger.info(`Retrieving yoti pdf with key ${yotiInstructionskey} from bucket ${bucket}`);
			const yotiPdfdata = await this.s3Client.send(new GetObjectCommand(yotiPdfSearchParams));

			if (yotiPdfdata.Body) {
				const chunks = [];
				for await (const chunk of yotiPdfdata.Body as AsyncIterable<Uint8Array>) {
				  chunks.push(chunk);
				}
				yotiPdfBuffer = Buffer.concat(chunks);
			
				this.logger.info("Yoti PDF file downloaded successfully."); 
			} else {
				this.logger.error("Error: No data found in the S3.");
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Yoti PDF from S3 bucket. No data found");

			}
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
		} catch (error) {
			this.logger.error("Error retrieving Yoti PDF from S3 bucket", { messageCode: MessageCodes.FAILED_YOTI_GET_INSTRUCTIONS });

			const singleMetric = this.metrics.singleMetric();
			singleMetric.addDimension("error", "unable_to_retrieve_yoti_instructions");
			singleMetric.addMetric("GeneratePrintedLetter_error", MetricUnits.Count, 1);

			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Yoti PDF from S3 bucket");
		}

		const coverLetterPdfBuffer = await this.pdfService.createPdf(f2fSessionInfo.sessionId);

		// Merge retrieved PDF's
		try {
			this.logger.info("Attempting to merge PDF's"); 

			const merger = new PDFMerger();
			await merger.add(coverLetterPdfBuffer);
			await merger.add(yotiPdfBuffer);

			mergedPdfBuffer = await merger.saveAsBuffer(); 
			this.logger.info("PDF's merged succesfully"); 
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
		} catch (error) {
			this.logger.error("Error merging PDFs", { messageCode: MessageCodes.FAILED_PDF_MERGE });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error merging PDFs");
		}


		try {
			const resizedMergedPdf = await this.resizePdf(mergedPdfBuffer);
			
			// Upload merged PDF
			const mergedUploadParams = {
				Bucket: bucket,
				Key: mergedLetterKey,
				Body: resizedMergedPdf,
				ContentType: "application/octet-stream",
			};

			this.logger.info(`Uploading merged PDF: ${mergedUploadParams.Key}`);
			await this.s3Client.send(new PutObjectCommand(mergedUploadParams));
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
		} catch (error) {
			this.logger.error("Error uploading merged or resizing PDF", { messageCode: MessageCodes.FAILED_MERGED_PDF_PUT });

			const singleMetric = this.metrics.singleMetric();
			singleMetric.addDimension("error", "unable_to_save_merged_pdf");
			singleMetric.addMetric("GeneratePrintedLetter_error", MetricUnits.Count, 1);

			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error uploading merged PDF");
		}

		return {
			sessionId: event.sessionId,
			pdf_preference: event.pdf_preference,
		};

	}

	async resizePdf(pdf: Uint8Array): Promise<Uint8Array> {
		const pdfDoc = await PDFDocument.load(pdf);
		const pages = pdfDoc.getPages();
	
		const a4Width = 595.28;
		const a4Height = 841.89;
		const scaling = 0.90;
	
		if (pages.length > 4) {
			const targetPage = pages[4]; 
			const { width, height } = targetPage.getSize();
	
			const scaledWidth = width * scaling;
			const scaledHeight = height * scaling;
	
			targetPage.setSize(a4Width, a4Height);
	
			const xOffset = (a4Width - scaledWidth) / 2; 
			const yOffset = (a4Height - scaledHeight) / 2; 
	
			targetPage.translateContent(xOffset, yOffset);
			targetPage.scaleContent(scaling, scaling);
		}
	
		const resizedPdf = await pdfDoc.save();
		return resizedPdf;
	}

}
