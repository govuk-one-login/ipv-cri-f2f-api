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

	async createSession(event: APIGatewayProxyEvent, incomingPayload: any): Promise<Response> {
		this.logger.info("START OF CREATESESSION")
		const trackingId = incomingPayload?.user_tracking_id;
		this.logger.info("SessionId from yotiSessionItem", { trackingId });
		const lastUuidChars = trackingId.slice(-4);
		const yotiSessionId = randomUUID();
		const lastYotiUuidChars = yotiSessionId.slice(-4);
		yotiSessionId.replace(lastYotiUuidChars, lastUuidChars);
		this.logger.debug(yotiSessionId)
		const yotiSessionItem = new YotiSessionItem()
		yotiSessionItem.session_id = yotiSessionId
		this.logger.info("CREATED SESSION ITEM", { yotiSessionItem })

		if (lastUuidChars[0] === '3' || lastUuidChars[0] === '2') {
			
			// CREATE_SESSION.session_id = yotiSessionId;
			return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));	
		}

		switch(lastUuidChars) {
			case '0000':
				this.logger.debug(JSON.stringify(yotiSessionItem));
				// VALID_RESPONSE.session_id = yotiSessionId;
				return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));	
			case '1400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(`BAD REQUEST: ${yotiSessionId}`))
			case '1401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(`UNAUTHORISED: ${yotiSessionId}`))
			case '1403':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(`FORBIDDEN: ${yotiSessionId}`))
			case '1404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(`CONFLICT: ${yotiSessionId}`))
			case '1503':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(`SERVICE UNAVAILABLE: ${yotiSessionId}`))
			case '1999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `No Yoti session with sessionId ${yotiSessionId} found`);
		}
	}

	async getSession(sessionId: string): Promise<Response> {

		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
				VALID_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
			case '0001':
				this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
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
			this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
			VALID_RESPONSE.session_id = sessionId;
			return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));	
		}

		switch(lastUuidChars) {
			case '0000':
				this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
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
				this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
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
				this.logger.debug(JSON.stringify(new YotiSessionRequest(sessionId)));
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
