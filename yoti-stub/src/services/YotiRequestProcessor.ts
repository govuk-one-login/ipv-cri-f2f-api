import { Response } from "../utils/Response";
import {PDFDocument} from "pdf-lib"
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
//import {encode, decode} from 'uint8-to-base64';
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { YotiService} from "../services/YotiService"
import {YotiSessionItem} from "../models/YotiSessionItem";
import {YotiSessionRequest} from "../models/YotiSessionRequest";
import { VALID_RESPONSE } from "../data/responses";
import { VALID_DL_RESPONSE } from "../data/driversLicenseResponse";

const SESSION_TABLE = process.env.SESSION_TABLE;

export class YotiRequestProcessor {
	private static instance: YotiRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly yotiService: YotiService;

	constructor(logger: Logger, metrics: Metrics) {
		if (!SESSION_TABLE ) {
			logger.error("Environment variable SESSION_TABLE or TXMA_QUEUE_URL or ISSUER is not configured");
			throw new AppError("Service incorrectly configured", HttpCodesEnum.SERVER_ERROR);
		}
		this.logger = logger;

		this.metrics = metrics;
		this.yotiService = YotiService.getInstance(SESSION_TABLE, this.logger, createDynamoDbClient());
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
		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				this.logger.info({ message: "found session", yotiSession });
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
			case '0001':
				this.logger.info({ message: "found session", yotiSession });
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE));	
			case '5400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, "Bad request")
			case '5401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorised")
			case '5404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, "NOT FOUND")
			case '5409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, "CONFLICT")
			case '5500':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVER_ERROR, "SERVER ERROR")
			case '5999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${sessionId} found`);
		}
	}

	async fetchInstructionsPdf(): Promise<any>{

		let pdfBytes;
		try {
			const pdfDoc =  await PDFDocument.create();
			const page = pdfDoc.addPage();

			page.moveTo(5, 200)
			 page.drawText("This is a demo page generated by Yoti Stub");
			pdfBytes = await pdfDoc.saveAsBase64()


		} catch (err) {
			console.log("Got err " + err)
			throw err;
		}

		return {
			headers: {
					'Content-Type': "application/octet-stream",
			            "Access-Control-Allow-Origin":"*",
				'Accept': 'application/pdf'},
			statusCode: 200,
			body:  pdfBytes,
			isBase64Encoded: true
		}
	}
}
