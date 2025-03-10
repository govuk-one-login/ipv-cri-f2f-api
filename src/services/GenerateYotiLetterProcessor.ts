import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ValidationHelper } from "../utils/ValidationHelper";
import { getClientConfig } from "../utils/ClientConfig";
import { Constants } from "../utils/Constants";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export class GenerateYotiLetterProcessor {

	private static instance: GenerateYotiLetterProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private yotiService!: YotiService;

	private s3Client: S3Client;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;

	private readonly validationHelper: ValidationHelper;

	private readonly YOTI_PRIVATE_KEY: string;

	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GENERATE_YOTI_LETTER_SERVICE);
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
		this.validationHelper = new ValidationHelper();
		this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
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
		YOTI_PRIVATE_KEY: string,
	): GenerateYotiLetterProcessor {
		if (!GenerateYotiLetterProcessor.instance) {
			GenerateYotiLetterProcessor.instance =
				new GenerateYotiLetterProcessor(logger, metrics, YOTI_PRIVATE_KEY);
		}
		return GenerateYotiLetterProcessor.instance;
	}

	async processRequest(event: any): Promise<any> {

		if (!this.validationHelper.checkRequiredYotiVars) throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);

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
		
		//Initialise Yoti Service base on session client_id
		const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSessionInfo.clientId, this.logger);

		if (!clientConfig) {
			this.logger.error("Unrecognised client in request", {
				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
			});
			return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
		}

		this.yotiService = YotiService.getInstance(this.logger, this.metrics, this.YOTI_PRIVATE_KEY);

		this.logger.info(
			"Fetching the Instructions Pdf from yoti for sessionId: ",
			f2fSessionInfo.yotiSessionId!,
		);
		const encoded = await this.yotiService.fetchInstructionsPdf(f2fSessionInfo.yotiSessionId!, clientConfig.YotiBaseUrl);

		if (!encoded) {
			this.logger.error("An error occurred when generating Yoti instructions pdf", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error occurred when generating Yoti instructions pdf");
		}
		const bucket = this.environmentVariables.yotiLetterBucketName();
		const folder = this.environmentVariables.yotiLetterBucketPDFFolder();
		const key = `${folder}-${f2fSessionInfo.yotiSessionId}`;

		const uploadParams = {
			Bucket: bucket,
			Key: key,
			Body: encoded,
			ContentType: "application/octet-stream",
		};

		try {
			this.logger.info(`Uploading object with key ${key} to bucket ${bucket}`);
			await this.s3Client.send(new PutObjectCommand(uploadParams));
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
		} catch (error) {
			this.logger.error("Error uploading Yoti PDF to S3 bucket", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error uploading Yoti PDF to S3 bucket");
		}

		this.metrics.addMetric("GenerateYotiLetter_instructions_saved", MetricUnits.Count, 1);
		return {
			sessionId: event.sessionId,
			pdfPreference: event.pdfPreference,
		};

	}
}
