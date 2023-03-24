import { Response } from "../utils/Response";

import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { YotiService} from "../services/YotiService"
import {YotiSessionItem} from "../models/YotiSessionItem";
import {YotiSessionRequest} from "../models/YotiSessionRequest";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {NodeHttpHandler} from "@aws-sdk/node-http-handler";

const SESSION_TABLE = process.env.SESSION_TABLE;
const TXMA_QUEUE_URL = process.env.TXMA_QUEUE_URL;
const ISSUER = process.env.ISSUER!;

export class YotiRequestProcessor {
	private static instance: YotiRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly yotiService: YotiService;

	private readonly s3Client: S3Client;

	constructor(logger: Logger, metrics: Metrics) {
		if (!SESSION_TABLE ) {
			logger.error("Environment variable SESSION_TABLE or TXMA_QUEUE_URL or ISSUER is not configured");
			throw new AppError("Service incorrectly configured", HttpCodesEnum.SERVER_ERROR);
		}
		this.logger = logger;

		this.metrics = metrics;
		this.yotiService = YotiService.getInstance(SESSION_TABLE, this.logger, createDynamoDbClient());
		this.s3Client = new S3Client({
			region: process.env.REGION,
			maxAttempts: 2,
			requestHandler: new NodeHttpHandler({
				connectionTimeout: 29000,
				socketTimeout: 29000,
			}),
		});
	}

	static getInstance(logger: Logger, metrics: Metrics): YotiRequestProcessor {
		if (!YotiRequestProcessor.instance) {
			YotiRequestProcessor.instance = new YotiRequestProcessor(logger, metrics);
		}
		return YotiRequestProcessor.instance;
	}

	async createSession(event: APIGatewayProxyEvent, yotiSessionItem: YotiSessionItem): Promise<Response> {

		 await this.yotiService.createYotiSession(yotiSessionItem);
			return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));

	}

	async getSession(sessionId: string): Promise<Response> {

		const yotiSession = await this.yotiService.getSessionById(sessionId);

		if (yotiSession != null) {

		 this.logger.info({ message: "found session", yotiSession });

			console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
		return new Response(HttpCodesEnum.OK, JSON.stringify(new YotiSessionRequest(sessionId)));
		} else {
		return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${sessionId} found`);
		}
	}

	async fetchInstructionsPdf(): Promise<any>{
		let response;
		let encoded;
		let strBody;
		const input = {
			"Bucket": "rimisra1",
			"Key": "response.pdf"
		};
		const command = new GetObjectCommand(input);

		try {
			response = await this.s3Client.send(command);
		} catch (err) {
			this.logger.error('Unable to fetch the file from S3', {err})
			// @ts-ignore
			if (err.code === "NoSuchKey") {
				this.logger.error(`S3 read error - file doesn't exist in bucket`);
				throw new AppError(`S3 read error - file  doesn't exist in bucket `, HttpCodesEnum.NOT_FOUND);
			}

		}
		try {
			strBody = await response?.Body?.transformToByteArray();
			if (!strBody || strBody.length <= 0) {
				this.logger.error("S3 file has empty content");
				throw new AppError("S3 file has empty content", HttpCodesEnum.BAD_REQUEST, );
			}
			// @ts-ignore
			encoded = Buffer.from(strBody, 'binary').toString('base64')

		} catch (err) {
			console.log("Got err " + err)
			throw err;
		}
		return {
			'headers': { "Content-Type": "application/pdf" },
			'statusCode': 200,
			'body': encoded,
			'isBase64Encoded': true
		}
	}
}
