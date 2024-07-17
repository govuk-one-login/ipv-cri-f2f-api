import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { F2fService } from "./F2fService";
import { YotiService } from "./YotiService";
import { AppError } from "../utils/AppError";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Response } from "../utils/Response";
import { PdfPreferencePayload } from "../type/PdfPreferencePayload";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

export class SendToGovNotifyProcessor {
  private static instance: SendToGovNotifyProcessor;

  private readonly f2fService: F2fService;

  constructor(private readonly logger: Logger, private readonly metrics: Metrics) {
  	const envVariables = new EnvironmentVariables(logger, ServicesEnum.REMINDER_SERVICE);
  	this.f2fService = F2fService.getInstance(envVariables.sessionTable(), logger, createDynamoDbClient());
  }

  static getInstance(logger: Logger, metrics: Metrics): SendToGovNotifyProcessor {
  	return this.instance || (this.instance = new SendToGovNotifyProcessor(logger, metrics));
  }

  async processRequest(event: PdfPreferencePayload): Promise<any> {

  	const f2fSessionInfo = await this.f2fService.getSessionById(event.govuk_signin_journey_id);

  	if (!f2fSessionInfo) {
  		this.logger.warn("Missing details in SESSION table", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
  	}

  	const bucket = process.env.YOTI_LETTER_BUCKET;
  	const folder = process.env.YOTI_PDF_BUCKET_FOLDER;
  	const key = `${folder}-${f2fSessionInfo.yotiSessionId}`;

  	const s3Client = new S3Client({
  		region: process.env.REGION,
  		maxAttempts: 2,
  		requestHandler: new NodeHttpHandler({
  			connectionTimeout: 29000,
  			socketTimeout: 29000,
  		}),
  	});

  	const retrieveParams = {
  		Bucket: bucket,
  		Key: key,
  	};

  	try {
  		this.logger.info("Fetching object from bucket");
  		await s3Client.send(new GetObjectCommand(retrieveParams));
  	} catch (error) {
  		this.logger.error({ message: "Error fetching object from S3 bucket", error });
  	}


  	return { statusCode: HttpCodesEnum.OK, body: "Success" };
  }
}
