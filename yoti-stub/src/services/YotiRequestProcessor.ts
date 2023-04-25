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
import { CREATE_SESSION } from "../data/createSession";
import { log } from "console";

const SESSION_TABLE = process.env.SESSION_TABLE;

export class YotiRequestProcessor {
	private static instance: YotiRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;

		this.metrics = metrics;
	}

	static getInstance(logger: Logger, metrics: Metrics): YotiRequestProcessor {
		if (!YotiRequestProcessor.instance) {
			YotiRequestProcessor.instance = new YotiRequestProcessor(logger, metrics);
		}
		return YotiRequestProcessor.instance;
	}

	async createSession(event: APIGatewayProxyEvent, yotiSessionItem: YotiSessionItem): Promise<Response> {

		const sessionId = yotiSessionItem.session_id;
		console.log("SESSION ID: ", sessionId);
		const lastUuidChars = sessionId.slice(-4);

		if (lastUuidChars[0] === '3' || lastUuidChars[0] === '2') {
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				// CREATE_SESSION.user_tracking_id = sessionId;
				return new Response(HttpCodesEnum.CREATED, JSON.stringify(sessionId));	
		}

		switch(lastUuidChars) {
			case '0000':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.CREATED, JSON.stringify(VALID_RESPONSE));	
			case '1400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(`BAD REQUEST: ${sessionId}`))
			case '1401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(`UNAUTHORISED: ${sessionId}`))
			case '1403':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(`FORBIDDEN: ${sessionId}`))
			case '1404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(`CONFLICT: ${sessionId}`))
			case '1503':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(`SERVICE UNAVAILABLE: ${sessionId}`))
			case '1999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${sessionId} found`);
		}
	}

	async getSession(sessionId: string): Promise<Response> {

		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
			case '0001':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_DL_RESPONSE.session_id = sessionId;
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

	async getSessionConfiguration(sessionId: string): Promise<Response> {

		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		if (lastUuidChars[0] === '3') {
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
		}

		switch(lastUuidChars) {
			case '0000':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
			case '2400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, "Bad request")
			case '2401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorised")
			case '2404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, "NOT FOUND")
			case '2409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, "CONFLICT")
			case '2503':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, "SERVICE UNAVAILABLE")
			case '2999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${sessionId} found`);
		}
	}

	async updateSessionInstructions(sessionId: string): Promise<Response> {
		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
			case '3400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, "Bad request")
			case '3401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorised")
			case '3404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, "NOT FOUND")
			case '3409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, "CONFLICT")
			case '3503':
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, "SERVICE UNAVAILABLE");
			case '3999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${sessionId} found`);
		}
	}

	async getSessionInstructions(sessionId: string): Promise<Response> {
		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				console.log(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE))
			case '4400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, "Bad request")
			case '4401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorised")
			case '4404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, "NOT FOUND")
			case '4409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, "CONFLICT")
			case '4500':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVER_ERROR, "SERVER ERROR")
			case '4503':
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, "SERVICE UNAVAILABLE");
			case '4999':
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
