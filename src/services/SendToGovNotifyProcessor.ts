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

  async processRequest(sessionId: any): Promise<any> {
  	console.log("982 BEFORE SESSION ID");
  	const f2fSessionInfo = await this.f2fService.getSessionById(sessionId);
    console.log("982 AFTER SESSION ID");

  	if (!f2fSessionInfo) {
  		this.logger.warn("Missing details in SESSION table", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
  	}

  	const bucket = "f2f-cri-api-982b-yotiletter-f2f-dev";
  	const folder = "pdf";
  	const key = `${folder}/yoti.pdf`;

    console.log("982 BUCKET", bucket)

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

    console.log("982 RETRIEVE PARAMS", retrieveParams)

  	try {
  		this.logger.info("Fetching object from bucket");
  		const s3Item = await s3Client.send(new GetObjectCommand(retrieveParams));
        console.log("S3 ITEM", s3Item)
  	} catch (error) {
  		this.logger.error({ message: "Error fetching object from S3 bucket", error });
  	}


  	return { statusCode: HttpCodesEnum.OK, body: "982 PDF FETCH SUCCESS" };
  }
}
