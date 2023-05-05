import { Response } from "../utils/Response";
import {PDFDocument} from "pdf-lib"
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
//import {encode, decode} from 'uint8-to-base64';
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import {YotiSessionItem} from "../models/YotiSessionItem";
import {YotiSessionRequest} from "../models/YotiSessionRequest";
import { VALID_RESPONSE } from "../data/getSessions/responses";
import { VALID_DL_RESPONSE } from "../data/getSessions/driversLicenseResponse";
import { CREATE_SESSION } from "../data/createSession";
import {VALID_PUT_INSTRUCTIONS_RESPONSE} from "../data/putInstructions/putInstructionsResponse";
import {PUT_INSTRUCTIONS_400} from "../data/putInstructions/putInstructions400";
import {PUT_INSTRUCTIONS_401} from "../data/putInstructions/putInstructions401";
import {PUT_INSTRUCTIONS_404} from "../data/putInstructions/putInstructions404";
import {PUT_INSTRUCTIONS_409} from "../data/putInstructions/putInstructions409";
import {PUT_INSTRUCTIONS_500} from "../data/putInstructions/putInstructions500";
import {POST_SESSIONS_400} from "../data/postSessions/postSessions400";
import {POST_SESSIONS_401} from "../data/postSessions/postSessions401";
import {POST_SESSIONS_403} from "../data/postSessions/postSessions403";
import {POST_SESSIONS_404} from "../data/postSessions/postSessions404";
import {POST_SESSIONS_503} from "../data/postSessions/postSessions503";
import {VALID_GET_SESSION_CONFIG_RESPONSE} from "../data/getSessionsConfig/getSessionConfigValidResponse";
import {GET_SESSIONS_CONFIG_400} from "../data/getSessionsConfig/getSessionsConfig400";
import {GET_SESSIONS_CONFIG_401} from "../data/getSessionsConfig/getSessionsConfig401";
import {GET_SESSIONS_CONFIG_404} from "../data/getSessionsConfig/getSessionsConfig404";
import {GET_SESSIONS_CONFIG_409} from "../data/getSessionsConfig/getSessionsConfig409";
import {GET_SESSIONS_CONFIG_503} from "../data/getSessionsConfig/getSessionsConfig503";
import {GET_INSTRUCTIONS_PDF_400} from "../data/getInstructionsPdf/getInstructionsPdf400";
import {GET_INSTRUCTIONS_PDF_401} from "../data/getInstructionsPdf/getInstructionsPdf401";
import {GET_INSTRUCTIONS_PDF_404} from "../data/getInstructionsPdf/getInstructionsPdf404";
import {GET_INSTRUCTIONS_PDF_409} from "../data/getInstructionsPdf/getInstructionsPdf409";
import {GET_INSTRUCTIONS_PDF_500} from "../data/getInstructionsPdf/getInstructionsPdf500";
import {GET_INSTRUCTIONS_PDF_503} from "../data/getInstructionsPdf/getInstructionsPdf503";
import { sleep } from "../utils/Sleep";

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

	/***
	 * POST /sessions
	 * @param event
	 * @param incomingPayload
	 */
	async createSession(event: APIGatewayProxyEvent, incomingPayload: any): Promise<Response> {
		this.logger.info("START OF CREATESESSION")
		const trackingId = incomingPayload.user_tracking_id;
		this.logger.info("SessionId from yotiSessionItem", { trackingId });
		const lastUuidChars = trackingId.slice(-4);
		const yotiSessionId = randomUUID();
		const lastYotiUuidChars = yotiSessionId.slice(-4);
		this.logger.info("lastUuid", { lastUuidChars });
		this.logger.info("lastYotiUuid", { lastYotiUuidChars });
		const replacedYotiSessionId = yotiSessionId.replace(lastYotiUuidChars, lastUuidChars);
		this.logger.info(replacedYotiSessionId)
		const yotiSessionItem = new YotiSessionItem()
		yotiSessionItem.session_id = replacedYotiSessionId
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
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_400))
			case '1401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(POST_SESSIONS_401))
			case '1403':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(POST_SESSIONS_403))
			case '1404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(POST_SESSIONS_404))
			case '1503':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(POST_SESSIONS_503))
			case '1999':
				// This will result in 504 timeout currently as sleep interval is 30s
				this.logger.info("sleeping for 30 secs");
				await sleep(30000)
				this.logger.info("I am awake, returning now");
				return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR,`Incoming user_tracking_id ${yotiSessionId} didn't match any of the use cases`);
		}
	}

	/***
	 * GET /sessions/{id}
	 * @param sessionId
	 */
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
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_400));
			case '5401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(POST_SESSIONS_401));
			case '5404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(POST_SESSIONS_404));
			// case '5409':
			// 	this.logger.info({ message: "last 4 ID chars", lastUuidChars});
			// 	return new Response(HttpCodesEnum.CONFLICT, "CONFLICT")
			// case '5500':
			// 	this.logger.info({ message: "last 4 ID chars", lastUuidChars});
			// 	return new Response(HttpCodesEnum.SERVER_ERROR, "SERVER ERROR")
			case '5999':
				// This will result in 504 timeout currently as sleep interval is 30s
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await sleep(30000);
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`);
		}
	}

	/***
	 * GET /sessions/{id}/configuration
	 * @param sessionId
	 */
	async getSessionConfiguration(sessionId: string): Promise<Response> {

		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		if (lastUuidChars[0] === '3') {
			VALID_GET_SESSION_CONFIG_RESPONSE.session_id = sessionId;
			return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
		}

		switch(lastUuidChars) {
			case '0000':
				VALID_GET_SESSION_CONFIG_RESPONSE.session_id = sessionId;
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
			case '2400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_SESSIONS_CONFIG_400));
			case '2401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_SESSIONS_CONFIG_401));
			case '2404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_SESSIONS_CONFIG_404));
			case '2409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(GET_SESSIONS_CONFIG_409));
			case '2503':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(GET_SESSIONS_CONFIG_503));
			case '2999':
				// This will result in 504 timeout currently as sleep interval is 30s
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await sleep(30000);
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`);
		}
	}

	/***
	 * PUT /sessions/{id}/instructions
	 * @param sessionId
	 */
	async updateSessionInstructions(sessionId: string): Promise<Response> {
		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
			case '3400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(PUT_INSTRUCTIONS_400))
			case '3401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(PUT_INSTRUCTIONS_401))
			case '3404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(PUT_INSTRUCTIONS_404))
			case '3409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(PUT_INSTRUCTIONS_409))
			case '3503':
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(PUT_INSTRUCTIONS_500));
			case '3999':
				// This will result in 504 timeout currently as sleep interval is 30s
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await new Promise(resolve => setTimeout(resolve, 30000));
				return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`);
		}
	}

	/***
	 * GET /sessions/{sessionId}/instructions/pdf
	 */
	async fetchInstructionsPdf(sessionId: string): Promise<any>{

		let pdfBytes;
		let successResp;
		try {
			const pdfDoc =  await PDFDocument.create();
			const page = pdfDoc.addPage();

			page.moveTo(5, 200)
			 page.drawText("This is a demo page generated by Yoti Stub");
			pdfBytes = await pdfDoc.saveAsBase64()
			successResp = {
				headers: {
					'Content-Type': "application/pdf",
						"Access-Control-Allow-Origin":"*",
						'Accept': '*/*'},
				statusCode: 200,
					body:  pdfBytes,
				isBase64Encoded: true
			}


		} catch (err) {
			console.log("Got err " + err)
			throw err;
		}

		const lastUuidChars = sessionId.slice(-4);
		this.logger.info({ message: "last 4 ID chars", lastUuidChars});

		switch(lastUuidChars) {
			case '0000':
				return successResp;
			case '4400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_INSTRUCTIONS_PDF_400));
			case '4401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_INSTRUCTIONS_PDF_401));
			case '4404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_INSTRUCTIONS_PDF_404));
			case '4409':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(GET_INSTRUCTIONS_PDF_409));
			case '4500':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(GET_INSTRUCTIONS_PDF_500));
			case '4503':
				return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(GET_INSTRUCTIONS_PDF_503));
			case '4999':
				// This will result in 504 timeout currently as sleep interval is 30s
				this.logger.info({ message: "last 4 ID chars", lastUuidChars});
				await sleep(30000);
				return successResp;
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`);
		}

	}
}
