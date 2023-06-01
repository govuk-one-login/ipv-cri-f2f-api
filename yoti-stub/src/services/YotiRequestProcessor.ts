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
import { VALID_RESPONSE_NFC } from "../data/getSessions/nfcResponse";
import { VALID_DL_RESPONSE } from "../data/getSessions/driversLicenseResponse";
import { EXPIRED_PASSPORT_RESPONSE } from "../data/getSessions/expiredPassport";
import { TAMPERED_DOCUMENT_RESPONSE } from "../data/getSessions/tamperedDocumentResponse";
import { AI_FAIL_MANUAL_FAIL } from "../data/getSessions/aiFailManualFail";
import { AI_FAIL_MANUAL_PASS } from "../data/getSessions/aiFailManualPass";
import { AI_PASS } from "../data/getSessions/aiPass";
import { DIFFERENT_PERSON_RESPONSE } from "../data/getSessions/differentPersonResponse";
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
import { ESP_PASSPORT } from "../data/getMediaContent/espPassportResponse";
import { NLD_NATIONAL_ID } from "../data/getMediaContent/nldNationalId";
import { GBR_PASSPORT } from "../data/getMediaContent/gbPassportResponse";
import { GBR_DRIVING_LICENCE } from "../data/getMediaContent/gbDriversLicenseResponse";
import { DEU_DRIVING_LICENCE } from "../data/getMediaContent/euDriversLicenseResponse";
import { GET_MEDIA_CONTENT_400 } from "../data/getMediaContent/getMediaContent400";
import { GET_MEDIA_CONTENT_401 } from "../data/getMediaContent/getMediaContent401";
import { GET_MEDIA_CONTENT_404 } from "../data/getMediaContent/getMediaContent404";
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
		const fullName = incomingPayload.resources.applicant_profile.full_name;
		const lastUuidChars = fullName.match(/\d+/g)[0];
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
		this.logger.info({ message: "last 4 ID chars", lastUuidChars });
		const PASSPORT_MEDIA_ID = '0001'
		let modifiedPayload;

		const processPositiveScenario = (lastUuidChars: string, sessionId: string): Response | undefined => {
			const logger = this.logger;
			const yotiSessionRequest = new YotiSessionRequest(sessionId);
		
			switch (lastUuidChars) {
				case '0000': // UK Drivers Licence
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_DL_RESPONSE.session_id = sessionId;
					VALID_DL_RESPONSE.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_DL_RESPONSE.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE.resources.id_documents[0].document_fields.media.id, lastUuidChars);
					return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE));

				case '0001': // UK Passport without Chip
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE.session_id = sessionId;
					VALID_RESPONSE.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));
		
				case '0002': // UK Passport with Chip
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					console.log('VALID_RESPONSE_NFC', JSON.stringify(VALID_RESPONSE_NFC));
					return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC));

				case '0003': // UK Passport - Different Person
					logger.debug(JSON.stringify(yotiSessionRequest));
					DIFFERENT_PERSON_RESPONSE.session_id = sessionId;
					DIFFERENT_PERSON_RESPONSE.resources.id_documents[0].document_fields.media.id = sessionId;
					DIFFERENT_PERSON_RESPONSE.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(DIFFERENT_PERSON_RESPONSE.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(DIFFERENT_PERSON_RESPONSE));
		
					case '0004': // UK Passport - Expired
					logger.debug(JSON.stringify(yotiSessionRequest));
					EXPIRED_PASSPORT_RESPONSE.session_id = sessionId;
					EXPIRED_PASSPORT_RESPONSE.resources.id_documents[0].document_fields.media.id = sessionId;
					EXPIRED_PASSPORT_RESPONSE.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EXPIRED_PASSPORT_RESPONSE.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(EXPIRED_PASSPORT_RESPONSE));
		
				case '0005': // UK Passport - Tampered
					logger.debug(JSON.stringify(yotiSessionRequest));
					TAMPERED_DOCUMENT_RESPONSE.session_id = sessionId;
					TAMPERED_DOCUMENT_RESPONSE.resources.id_documents[0].document_fields.media.id = sessionId;
					TAMPERED_DOCUMENT_RESPONSE.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(TAMPERED_DOCUMENT_RESPONSE.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(TAMPERED_DOCUMENT_RESPONSE));
		
				case '0006': // UK Passport - FaceCheck Failed
					logger.debug(JSON.stringify(yotiSessionRequest));
					AI_FAIL_MANUAL_FAIL.session_id = sessionId;
					AI_FAIL_MANUAL_FAIL.resources.id_documents[0].document_fields.media.id = sessionId;
					AI_FAIL_MANUAL_FAIL.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_FAIL_MANUAL_FAIL.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					console.log('VALID_RESPONSE_NFC', JSON.stringify(AI_FAIL_MANUAL_FAIL));
					return new Response(HttpCodesEnum.OK, JSON.stringify(AI_FAIL_MANUAL_FAIL));

				case '0007': // UK Passport - FaceCheck AI Failed Manual Passed
					logger.debug(JSON.stringify(yotiSessionRequest));
					AI_FAIL_MANUAL_PASS.session_id = sessionId;
					AI_FAIL_MANUAL_PASS.resources.id_documents[0].document_fields.media.id = sessionId;
					AI_FAIL_MANUAL_PASS.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_FAIL_MANUAL_PASS.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(AI_FAIL_MANUAL_PASS));
				
				case '0008': // UK Passport - AI Passed
					logger.debug(JSON.stringify(yotiSessionRequest));
					AI_PASS.session_id = sessionId;
					AI_PASS.resources.id_documents[0].document_fields.media.id = sessionId;
					AI_PASS.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_PASS.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					return new Response(HttpCodesEnum.OK, JSON.stringify(AI_PASS));

				case '0009': // UK Passport - FACE_NOT_GENUINE
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_FACE_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "FACE_NOT_GENUINE";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

				case '0010': // UK Passport - LARGE_AGE_GAP
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_FACE_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "LARGE_AGE_GAP";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));
				
				case '0011': // UK Passport - PHOTO_OF_MASK
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_FACE_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "PHOTO_OF_MASK";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

				case '0012': // UK Passport - PHOTO_OF_PHOTO
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_FACE_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "PHOTO_OF_PHOTO";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

				case '0013': // UK Passport - DIFFERENT_PERSON
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_FACE_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "DIFFERENT_PERSON";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0014': // UK Passport - COUNTERFEIT
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "COUNTERFEIT";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0015': // UK Passport - EXPIRED_DOCUMENT
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "EXPIRED_DOCUMENT";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0016': // UK Passport - FRAUD_LIST_MATCH
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "FRAUD_LIST_MATCH";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0017': // UK Passport - DIFFERENT_PERSON
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "DOCUMENT_COPY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "DOCUMENT_COPY";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0018': // UK Passport - ISSUING_AUTHORITY_INVALID
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "ISSUING_AUTHORITY_INVALID";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0019': // UK Passport - TAMPERED
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "TAMPERED";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0020': // UK Passport - MISSING_HOLOGRAM
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "MISSING_HOLOGRAM";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0021': // UK Passport - NO_HOLOGRAM_MOVEMENT
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "NO_HOLOGRAM_MOVEMENT";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0022': // UK Passport - DATA_MISMATCH
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "DATA_MISMATCH";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0023': // UK Passport - DOC_NUMBER_INVALID
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "DOC_NUMBER_INVALID";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0024': // UK Passport - CHIP_DATA_INTEGRITY_FAILED
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "CHIP_DATA_INTEGRITY_FAILED";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0025': // UK Passport - CHIP_SIGNATURE_VERIFICATION_FAILED
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "CHIP_SIGNATURE_VERIFICATION_FAILED";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0026': // UK Passport - CHIP_CSCA_VERIFICATION_FAILED
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "CHIP_CSCA_VERIFICATION_FAILED";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));


					case '0027': // UK Passport - IBV_VISUAL_REVIEW_CHECK
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "IBV_VISUAL_REVIEW_CHECK") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "IBV_VISUAL_REVIEW_CHECK";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0028': // UK Passport - DOCUMENT_SCHEME_VALIDITY_CHECK
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "DOCUMENT_SCHEME_VALIDITY_CHECK") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "DOCUMENT_SCHEME_VALIDITY_CHECK";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

					case '0029': // UK Passport - PROFILE_DOCUMENT_MATCH
					logger.debug(JSON.stringify(yotiSessionRequest));
					VALID_RESPONSE_NFC.session_id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = sessionId;
					VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC.resources.id_documents[0].document_fields.media.id, PASSPORT_MEDIA_ID);
					modifiedPayload = {
						...VALID_RESPONSE_NFC,
						checks: VALID_RESPONSE_NFC.checks.map((check: any) => {
							if (check.type === "PROFILE_DOCUMENT_MATCH") {
								check.report.recommendation.value = "REJECT";
								check.report.recommendation.reason = "PROFILE_DOCUMENT_MATCH";
							}
							return check;
						}),
					};
					console.log('modifiedPayload', JSON.stringify(modifiedPayload));
					return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

				default:
					return undefined;
			}
		};
		
		const replaceLastUuidChars = (str: string, lastUuidChars: string): string => {
			return str.replace(/\d{4}$/, lastUuidChars);
		};
	
		if (lastUuidChars.substring(0, 2) === '00') {
			const response = processPositiveScenario(lastUuidChars, sessionId);
			if (response) {
				return response;
			}
		}
	
		switch (lastUuidChars) {
			case '5400':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_400));
			case '5401':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(POST_SESSIONS_401));
			case '5404':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(POST_SESSIONS_404));
			case '5999':
				this.logger.info({ message: "last 4 ID chars", lastUuidChars });
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

	/***
	 * GET /sessions/{sessionId}/media/{mediaId}/content
	 */
	async getMediaContent(mediaId: string): Promise<Response> {
		const lastUuidChars = mediaId.slice(-4);
		const logger = this.logger;
		logger.info({ message: "last 4 ID chars", lastUuidChars });
	
		switch (lastUuidChars) {
			case '0000':
				return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE));
	
			case '0001':
				return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT));
	
			case '5400':
				logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_MEDIA_CONTENT_400));
	
			case '5401':
				logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_MEDIA_CONTENT_401));
	
			case '5404':
				logger.info({ message: "last 4 ID chars", lastUuidChars });
				return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_MEDIA_CONTENT_404));
	
			case '5999':
				// This will result in 504 timeout currently as sleep interval is 30s
				logger.info({ message: "last 4 ID chars", lastUuidChars });
				await sleep(30000);
				return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT));
	
			default:
				return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming mediaId ${mediaId} didn't match any of the use cases`);
		}
	}
	
}
