import {Response} from "../utils/Response";
import {PDFDocument} from "pdf-lib"
import {Metrics} from "@aws-lambda-powertools/metrics";
import {randomUUID} from "crypto";
import {Logger} from "@aws-lambda-powertools/logger";
import {sleep} from "../utils/Sleep";
import {HttpCodesEnum} from "../utils/HttpCodesEnum";
// Request mappings
import {
    DocumentMapping,
    UK_DL_MEDIA_ID,
    UK_PASSPORT_MEDIA_ID,
    NON_UK_PASSPORT_MEDIA_ID,
    SUPPORTED_DOCUMENTS,
    IPV_INTEG_FULL_NAME_HAPPY,
    IPV_INTEG_FULL_NAME_UNHAPPY,
    EU_DL_MEDIA_ID,
    EEA_ID_MEDIA_ID,
    IPV_INTEG_FULL_NAME_PAUL_BUTTIVANT_UNHAPPY,
    UK_PASSPORT_ONLY_FULLNAME_MEDIA_ID,
    UK_PASSPORT_GIVEN_NAME_MEDIA_ID,
    UK_PASSPORT_FAMILY_NAME_MEDIA_ID,
    UK_PASSPORT_GIVEN_NAME_WRONG_SPLIT,
    UK_DL_WRONG_NON_SPACE_CHARS,
    EU_DL_INCORRECT_NAME_SEQUENCE,
    NON_UK_PASSPORT_WRONG_SPLIT_SURNAME,
    UK_PASSPORT_MEDIA_ID_JOYCE,
    IPV_INTEG_FULL_NAME_JOYCE,
    IPV_INTEG_FULL_NAME_PAUL,
    IPV_INTEG_FULL_NAME_ANTHONY,
    UK_PASSPORT_MEDIA_ID_ANTHONY,
    UK_PASSPORT_MEDIA_ID_PAUL,
    IPV_INTEG_FULL_NAME_SUZIE,
    UK_PASSPORT_MEDIA_ID_SUZIE,
    UK_DL_MISSING_FORMATTED_ADDRESS_MEDIA_ID,
    YOTI_DOCUMENT_FIELDS_INFO_NOT_FOUND,
    MISSING_NAME_INFO_IN_DOCUMENT_FIELDS
} from "../utils/Constants";

// Response types
import {VALID_RESPONSE} from "../data/getSessions/responses";
import {VALID_RESPONSE_NFC} from "../data/getSessions/nfcResponse";
import {VALID_DL_RESPONSE} from "../data/getSessions/driversLicenseResponse";
import {EXPIRED_PASSPORT_RESPONSE} from "../data/getSessions/expiredPassport";
import {TAMPERED_DOCUMENT_RESPONSE} from "../data/getSessions/tamperedDocumentResponse";
import {AI_FAIL_MANUAL_FAIL} from "../data/getSessions/aiFailManualFail";
import {AI_FAIL_MANUAL_PASS} from "../data/getSessions/aiFailManualPass";
import {AI_PASS} from "../data/getSessions/aiPass";
import { DOCUMENT_FIELDS_SECOND } from "../data/getSessions/documentFieldsSecond";
import { MULTIPLE_DOCUMENT_FIELDS } from "../data/getSessions/multipleDocumentFields";
import {EEA_VALID_RESPONSE_NFC} from "../data/getSessions/nfcEeaValidResponse";
import {EEA_AI_MATCH_NO_CHIP} from "../data/getSessions/eeaAiMatchNoChip";
import {EEA_AI_FAIL_MANUAL_PASS} from "../data/getSessions/eeaAiFailManualPass";
import {EEA_MANUAL_PASS} from "../data/getSessions/eeaManualPass";
import {DIFFERENT_PERSON_RESPONSE} from "../data/getSessions/differentPersonResponse";
import {ERROR_RESPONSE_HEADERS} from "../data/errorHeaders";
import {VALID_PUT_INSTRUCTIONS_RESPONSE} from "../data/putInstructions/putInstructionsResponse";
import {PUT_INSTRUCTIONS_400} from "../data/putInstructions/putInstructions400";
import {PUT_INSTRUCTIONS_401} from "../data/putInstructions/putInstructions401";
import {PUT_INSTRUCTIONS_404} from "../data/putInstructions/putInstructions404";
import {PUT_INSTRUCTIONS_409} from "../data/putInstructions/putInstructions409";
import {PUT_INSTRUCTIONS_500} from "../data/putInstructions/putInstructions500";
import {FAD_CODE_INCORRECT_FORMAT} from "../data/putInstructions/fadCodeIncorrectFormat";
import {FAD_CODE_INVALID} from "../data/putInstructions/fadCodeInvalid";
import {FAD_CODE_NOT_INCLUDED} from "../data/putInstructions/fadCodeNotIncluded";
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
import {ESP_PASSPORT} from "../data/getMediaContent/espPassportResponse";
import {NLD_NATIONAL_ID} from "../data/getMediaContent/nldNationalId";
import {GBR_PASSPORT} from "../data/getMediaContent/gbPassportResponse";
import {GBR_DRIVING_LICENCE} from "../data/getMediaContent/gbDriversLicenseResponse";
import {DEU_DRIVING_LICENCE} from "../data/getMediaContent/euDriversLicenseResponse";
import {GET_MEDIA_CONTENT_400} from "../data/getMediaContent/getMediaContent400";
import {GET_MEDIA_CONTENT_401} from "../data/getMediaContent/getMediaContent401";
import {GET_MEDIA_CONTENT_404} from "../data/getMediaContent/getMediaContent404";
import {YOTI_DOCUMENT_FIELDS_INFO_NOT_FOUND_500} from "../data/getMediaContent/yotiDocumentFieldsInfoNotFound500";
import {MISSING_NAME_INFO_IN_DOCUMENT_FIELDS_500} from "../data/getMediaContent/missingNameInfoInDocumentFields500";
import {YOTI_DOCUMENT_FIELDS_NOT_POPULATED_500} from "../data/getMediaContent/yotiDocumentFieldsNotPopulated500";
import { MULTIPLE_DOCUMENT_FIELDS_IN_RESPONSE_500 } from "../data/getMediaContent/multipleDocumentFieldsInResponse500";
import { YOTI_DOCUMENT_FIELDS_MEDIA_ID_NOT_FOUND_500 } from "../data/getMediaContent/yotiDocumentFieldsMediaIdNotFound500";
import {POST_SESSIONS_INVALID_ADDRESS_400} from "../data/postSessions/postSessionsInvalidAddress400";
import {GBR_PASSPORT_JOYCE} from "../data/getMediaContent/gbPassportResponseJOYCE";
import { GBR_PASSPORT_ONLY_FULLNAME } from "../data/getMediaContent/gbPassportOnlyFullname";
import { GBR_PASSPORT_GIVEN_NAME } from "../data/getMediaContent/gbPassportGivenName";
import { GBR_PASSPORT_FAMILY_NAME } from "../data/getMediaContent/gbPassportFamilyName";
import { GBR_PASSPORT_WRONG_SPLIT_GIVEN_NAME } from "../data/getMediaContent/gbPassportWrongSplitGivenName";
import { GBR_DRIVING_LICENCE_NON_SPACE_CHARS_RETURNED_WRONG } from "../data/getMediaContent/gbDriversLicenseNonSpaceCharsReturnedWrong";
import { ESP_PASSPORT_WRONG_SPLIT_SURNAMES } from "../data/getMediaContent/espPassportWrongSplitSurnames";
import { DEU_DRIVING_LICENCE_INCORRECT_NAME_SEQUENCE } from "../data/getMediaContent/euDriversLicenseIncorrectNameSequence";
import {GBR_PASSPORT_PAUL} from "../data/getMediaContent/gbPassportResponsePAUL";
import {GBR_PASSPORT_ANTHONY} from "../data/getMediaContent/gbPassportResponseANTHONY";
import {GBR_PASSPORT_SUZIE} from "../data/getMediaContent/gbPassportResponseSUZIE";
import { GBR_DRIVING_LICENCE_MISSING_FORMATTED_ADDRESS } from "../data/getMediaContent/gbDriversLicenseMissingFormatedAddressResponse";
import { GET_SESSIONS_429 } from "../data/getSessions/getSessions429";
import { GET_SESSIONS_503 } from "../data/getSessions/getSessions503";

// Not sure about these
import {YotiSessionItem} from "../models/YotiSessionItem";
import {YotiSessionRequest} from "../models/YotiSessionRequest";

export class YotiRequestProcessor {
    private static instance: YotiRequestProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    private createSessionRequestCount: number;

    constructor(logger: Logger, metrics: Metrics) {
        this.logger = logger;

        this.metrics = metrics;

        this.createSessionRequestCount = 0;
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
    async createSession(incomingPayload: any): Promise<Response> {
        
        this.logger.info("START OF CREATESESSION")
	    this.logger.info("/createSession Payload", {incomingPayload});
        if( (!incomingPayload.resources.applicant_profile.structured_postal_address.building_number || incomingPayload.resources.applicant_profile.structured_postal_address.building_number === "") &&
            (!incomingPayload.resources.applicant_profile.structured_postal_address.sub_building || incomingPayload.resources.applicant_profile.structured_postal_address.sub_building === "") &&
            (!incomingPayload.resources.applicant_profile.structured_postal_address.building || incomingPayload.resources.applicant_profile.structured_postal_address.building === "") ){
            this.logger.error("Bad Request: structured_postal_address is INVALID");
            return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_INVALID_ADDRESS_400), ERROR_RESPONSE_HEADERS);
        }
        const fullName = incomingPayload.resources.applicant_profile.full_name;
        const yotiSessionItem = new YotiSessionItem();
        const yotiSessionId = randomUUID();

        const lastYotiUuidChars = yotiSessionId.slice(-4);
        this.logger.info("lastYotiUuid", {lastYotiUuidChars});

        //For IPV Integration happy path
        if (IPV_INTEG_FULL_NAME_HAPPY === fullName) {
            //Replacing returned yoti sessionid with success 0100 at the end to return GBR_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0100");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration happy path JOYCE
        if (IPV_INTEG_FULL_NAME_JOYCE.toUpperCase() === fullName.toUpperCase() ) {
            //Replacing returned yoti sessionid with success 0129 at the end to return GBR_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0129");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration happy path PAUL
        if (IPV_INTEG_FULL_NAME_PAUL.toUpperCase() === fullName.toUpperCase() ) {
            //Replacing returned yoti sessionid with success 0130 at the end to return GBR_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0130");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration happy path ANTHONY
        if (IPV_INTEG_FULL_NAME_ANTHONY.toUpperCase() === fullName.toUpperCase() ) {
            //Replacing returned yoti sessionid with success 0131 at the end to return GBR_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0131");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration happy path SUZIE
        if (IPV_INTEG_FULL_NAME_SUZIE.toUpperCase() === fullName.toUpperCase() ) {
            //Replacing returned yoti sessionid with success 0132 at the end to return GBR_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0132");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration UnHappy path
        if (IPV_INTEG_FULL_NAME_UNHAPPY === fullName) {
            //Replacing returned yoti sessionid with success 0204 at the end to return NON_UK_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0204");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For IPV Integration UnHappy path name matches Paul BUTTIVANT
        if (IPV_INTEG_FULL_NAME_PAUL_BUTTIVANT_UNHAPPY.toUpperCase() === fullName.toUpperCase()) {
            //Replacing returned yoti sessionid with success 0205 at the end to return NON_UK_PASSPORT
            yotiSessionItem.session_id = yotiSessionId.replace(lastYotiUuidChars, "0205");
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        //For all other cases
        const lastFullNameChars = fullName.match(/\d+/g)[0];
        const firstTwoChars = lastFullNameChars.slice(0, 2);

        this.logger.info("lastFullNameChars", {lastFullNameChars});
        const replacedYotiSessionId = yotiSessionId.replace(lastYotiUuidChars, lastFullNameChars);
        this.logger.info(replacedYotiSessionId)

        yotiSessionItem.session_id = replacedYotiSessionId
        this.logger.info("CREATED SESSION ITEM", {yotiSessionItem})

        this.logger.info("Create Session Success Scenarios", { SUPPORTED_DOCUMENTS });

        if (SUPPORTED_DOCUMENTS.includes(firstTwoChars)) {
            this.logger.debug(JSON.stringify(yotiSessionItem));
            this.logger.info("Yoti Session Item", JSON.stringify(yotiSessionItem));
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        if (lastFullNameChars[0] === '3' || lastFullNameChars[0] === '2') {
            return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
        }

        switch (lastFullNameChars) {
            case '1400':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_400), ERROR_RESPONSE_HEADERS)
            case '1401':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(POST_SESSIONS_401), ERROR_RESPONSE_HEADERS)
            case '1403':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                return new Response(HttpCodesEnum.FORBIDDEN, JSON.stringify(POST_SESSIONS_403), ERROR_RESPONSE_HEADERS)
            case '1404':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(POST_SESSIONS_404), ERROR_RESPONSE_HEADERS)
            case '1503':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(POST_SESSIONS_503), ERROR_RESPONSE_HEADERS)
            case '1999':
                // This will result in 504 timeout currently as sleep interval is 30s
                this.logger.info("sleeping for 30 secs");
                await sleep(30000)
                this.logger.info("I am awake, returning now");
                return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
            // retries
            
            case '1429': //2 fails + success
                this.createSessionRequestCount++;
                if (this.createSessionRequestCount < 3) {
                    return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(POST_SESSIONS_503), ERROR_RESPONSE_HEADERS)
                } else {
                    this.createSessionRequestCount = 0;
                    return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem.session_id));
                }
                // this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                // this.logger.warn({ message: `createSession - Retrying to create Yoti session. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to create session", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_CREATING_YOTI_SESSION", xRequestId: "dummy-request-id" });
    		    // await sleep(5000);
                // return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem.session_id));
            case '1500':
                this.logger.info({message: "last 4 ID chars", lastFullNameChars});
                this.logger.warn({ message: `createSession - Retrying to create Yoti session. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to create session", yotiErrorCode: 500, yotiErrorStatus: 500, messageCode: "FAILED_CREATING_YOTI_SESSION", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.CREATED, JSON.stringify(yotiSessionItem));
            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming user_tracking_id ${yotiSessionId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }
    }

    /***
     * GET /sessions/{id}
     * @param sessionId
     */
    async getSession(sessionId: string): Promise<Response> {
        const lastUuidChars = sessionId.slice(-4);
        const firstTwoChars = lastUuidChars.slice(0, 2);
        this.logger.info({message: "last 4 ID chars", lastUuidChars});
        let modifiedPayload;

        const processPositiveScenario = (lastUuidChars: string, sessionId: string): Response | undefined => {
            const logger = this.logger;
            const yotiSessionRequest = new YotiSessionRequest(sessionId);

            if (firstTwoChars === DocumentMapping.UK_DL) { // UK - Driving Licence Scenarios
                switch (lastUuidChars) {
                    case '0000': // UK Driving License Success - Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0000 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));
                        VALID_DL_RESPONSE_0000.session_id = sessionId; // Sets the session_id in the JSON response to match this function's
                        VALID_DL_RESPONSE_0000.resources.id_documents[0].document_fields.media.id = sessionId; // Media.id is also assigned the sessionId
                        // The last 4 digits of the media.id are changed to match the media code for UK DL
                        VALID_DL_RESPONSE_0000.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0000.resources.id_documents[0].document_fields.media.id, UK_DL_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0000));

                    case '0001': // UK Driving License Success - Face Match not automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0001 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));
                        VALID_DL_RESPONSE_0001.session_id = sessionId;
                        VALID_DL_RESPONSE_0001.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_DL_RESPONSE_0001.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0001.resources.id_documents[0].document_fields.media.id, UK_DL_MEDIA_ID);
                        const updatedPayload = {
                            ...VALID_DL_RESPONSE_0001,
                            checks: VALID_DL_RESPONSE_0001.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    return {
                                        ...check,
                                        report: {
                                            ...check.report,
                                            breakdown: [
                                                ...check.report.breakdown,
                                                {
                                                    sub_check: "manual_face_match",
                                                    result: "PASS",
                                                    details: [],
                                                    process: "EXPERT_REVIEW"
                                                }
                                            ]
                                        }
                                    };
                                }
                                return check;
                            })
                        };
                        return new Response(HttpCodesEnum.OK, JSON.stringify(updatedPayload));

                    case '0002': // UK Driving License Success - Non Space Characters in Name Returned Differently
                    logger.debug(JSON.stringify(yotiSessionRequest));
                    const VALID_DL_RESPONSE_0002 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));
                    VALID_DL_RESPONSE_0002.session_id = sessionId;
                    VALID_DL_RESPONSE_0002.resources.id_documents[0].document_fields.media.id = sessionId;
                    VALID_DL_RESPONSE_0002.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0002.resources.id_documents[0].document_fields.media.id, UK_DL_WRONG_NON_SPACE_CHARS);
                    return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0002));

                    case '0003': // UK Driving License Success - No formatted_address in structural_address
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0003 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));
                        VALID_DL_RESPONSE_0003.session_id = sessionId; 
                        VALID_DL_RESPONSE_0003.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_DL_RESPONSE_0003.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0003.resources.id_documents[0].document_fields.media.id, UK_DL_MISSING_FORMATTED_ADDRESS_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0003));
                    default:
                        return undefined;
                }
            }

            if (firstTwoChars === DocumentMapping.UK_PASSPORT) { // UK - Passport Scenarios
                switch (lastUuidChars) {
                    case '0100': // UK Passport Success - Chip Readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0100 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0100.session_id = sessionId;
                        VALID_RESPONSE_NFC_0100.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0100.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0100.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0100));

                    case '0101': // UK Passport Success - Chip NOT readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_0101 = JSON.parse(JSON.stringify(VALID_RESPONSE));

                        VALID_RESPONSE_0101.session_id = sessionId;
                        VALID_RESPONSE_0101.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_0101.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_0101.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_0101));

                    case '0102': // UK Passport Success - Chip Readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const AI_FAIL_MANUAL_PASS_0102 = JSON.parse(JSON.stringify(AI_FAIL_MANUAL_PASS));

                        AI_FAIL_MANUAL_PASS_0102.session_id = sessionId;
                        AI_FAIL_MANUAL_PASS_0102.resources.id_documents[0].document_fields.media.id = sessionId;
                        AI_FAIL_MANUAL_PASS_0102.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_FAIL_MANUAL_PASS_0102.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(AI_FAIL_MANUAL_PASS_0102));

                    case '0103': // UK Passport Success - Chip NOT readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const AI_PASS_0103 = JSON.parse(JSON.stringify(AI_PASS));

                        AI_PASS_0103.session_id = sessionId;
                        AI_PASS_0103.resources.id_documents[0].document_fields.media.id = sessionId;
                        AI_PASS_0103.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_PASS_0103.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(AI_PASS_0103));

                    case '0104': // UK Passport - Different Person
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const DIFFERENT_PERSON_RESPONSE_0104 = JSON.parse(JSON.stringify(DIFFERENT_PERSON_RESPONSE));

                        DIFFERENT_PERSON_RESPONSE_0104.session_id = sessionId;
                        DIFFERENT_PERSON_RESPONSE_0104.resources.id_documents[0].document_fields.media.id = sessionId;
                        DIFFERENT_PERSON_RESPONSE_0104.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(DIFFERENT_PERSON_RESPONSE_0104.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(DIFFERENT_PERSON_RESPONSE_0104));

                    case '0105': // UK Passport - Expired
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const EXPIRED_PASSPORT_RESPONSE_0105 = JSON.parse(JSON.stringify(EXPIRED_PASSPORT_RESPONSE));

                        EXPIRED_PASSPORT_RESPONSE_0105.session_id = sessionId;
                        EXPIRED_PASSPORT_RESPONSE_0105.resources.id_documents[0].document_fields.media.id = sessionId;
                        EXPIRED_PASSPORT_RESPONSE_0105.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EXPIRED_PASSPORT_RESPONSE_0105.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(EXPIRED_PASSPORT_RESPONSE_0105));

                    case '0106': // UK Passport - Tampered
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const TAMPERED_DOCUMENT_RESPONSE_0106 = JSON.parse(JSON.stringify(TAMPERED_DOCUMENT_RESPONSE));

                        TAMPERED_DOCUMENT_RESPONSE_0106.session_id = sessionId;
                        TAMPERED_DOCUMENT_RESPONSE_0106.resources.id_documents[0].document_fields.media.id = sessionId;
                        TAMPERED_DOCUMENT_RESPONSE_0106.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(TAMPERED_DOCUMENT_RESPONSE_0106.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(TAMPERED_DOCUMENT_RESPONSE_0106));

                    case '0107': // UK Passport - FaceCheck Failed
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const AI_FAIL_MANUAL_FAIL_0107 = JSON.parse(JSON.stringify(AI_FAIL_MANUAL_FAIL));

                        AI_FAIL_MANUAL_FAIL_0107.session_id = sessionId;
                        AI_FAIL_MANUAL_FAIL_0107.resources.id_documents[0].document_fields.media.id = sessionId;
                        AI_FAIL_MANUAL_FAIL_0107.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_FAIL_MANUAL_FAIL_0107.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        console.log('VALID_RESPONSE_NFC', JSON.stringify(AI_FAIL_MANUAL_FAIL_0107));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(AI_FAIL_MANUAL_FAIL_0107));

                    case '0108': // UK Passport Fails due to FACE_NOT_GENUINE
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0108 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0108.session_id = sessionId;
                        VALID_RESPONSE_NFC_0108.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0108.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0108.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0108,
                            checks: VALID_RESPONSE_NFC_0108.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "FACE_NOT_GENUINE";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0109': // UK Passport Fails due to LARGE_AGE_GAP
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0109 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0109.session_id = sessionId;
                        VALID_RESPONSE_NFC_0109.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0109.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0109.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0109,
                            checks: VALID_RESPONSE_NFC_0109.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "LARGE_AGE_GAP";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0110': // UK Passport - PHOTO_OF_MASK
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0110 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0110.session_id = sessionId;
                        VALID_RESPONSE_NFC_0110.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0110.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0110.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0110,
                            checks: VALID_RESPONSE_NFC_0110.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "PHOTO_OF_MASK";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0111': // UK Passport - PHOTO_OF_PHOTO
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0111 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0111.session_id = sessionId;
                        VALID_RESPONSE_NFC_0111.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0111.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0111.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0111,
                            checks: VALID_RESPONSE_NFC_0111.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "PHOTO_OF_PHOTO";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0112': // UK Passport - DIFFERENT_PERSON
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_012 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_012.session_id = sessionId;
                        VALID_RESPONSE_NFC_012.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_012.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_012.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_012,
                            checks: VALID_RESPONSE_NFC_012.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "DIFFERENT_PERSON";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0113': // UK Passport - COUNTERFEIT
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0113 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0113.session_id = sessionId;
                        VALID_RESPONSE_NFC_0113.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0113.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0113.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0113,
                            checks: VALID_RESPONSE_NFC_0113.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "COUNTERFEIT";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0114': // UK Passport - EXPIRED_DOCUMENT
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0114 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0114.session_id = sessionId;
                        VALID_RESPONSE_NFC_0114.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0114.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0114.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0114,
                            checks: VALID_RESPONSE_NFC_0114.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "EXPIRED_DOCUMENT";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0115': // UK Passport - FRAUD_LIST_MATCH
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0115 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0115.session_id = sessionId;
                        VALID_RESPONSE_NFC_0115.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0115.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0115.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0115,
                            checks: VALID_RESPONSE_NFC_0115.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "FRAUD_LIST_MATCH";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0116': // UK Passport - DIFFERENT_PERSON
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0116 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0116.session_id = sessionId;
                        VALID_RESPONSE_NFC_0116.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0116.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0116.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0116,
                            checks: VALID_RESPONSE_NFC_0116.checks.map((check: any) => {
                                if (check.type === "DOCUMENT_COPY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "DOCUMENT_COPY";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0117': // UK Passport - ISSUING_AUTHORITY_INVALID
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0117 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0117.session_id = sessionId;
                        VALID_RESPONSE_NFC_0117.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0117.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0117.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0117,
                            checks: VALID_RESPONSE_NFC_0117.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "ISSUING_AUTHORITY_INVALID";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0118': // UK Passport - TAMPERED
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0118 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0118.session_id = sessionId;
                        VALID_RESPONSE_NFC_0118.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0118.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0118.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0118,
                            checks: VALID_RESPONSE_NFC_0118.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "TAMPERED";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0119': // UK Passport - MISSING_HOLOGRAM
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0119 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0119.session_id = sessionId;
                        VALID_RESPONSE_NFC_0119.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0119.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0119.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0119,
                            checks: VALID_RESPONSE_NFC_0119.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "MISSING_HOLOGRAM";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0120': // UK Passport - NO_HOLOGRAM_MOVEMENT
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0120 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0120.session_id = sessionId;
                        VALID_RESPONSE_NFC_0120.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0120.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0120.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0120,
                            checks: VALID_RESPONSE_NFC_0120.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "NO_HOLOGRAM_MOVEMENT";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0121': // UK Passport - DATA_MISMATCH
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0121 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0121.session_id = sessionId;
                        VALID_RESPONSE_NFC_0121.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0121.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0121.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0121,
                            checks: VALID_RESPONSE_NFC_0121.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "DATA_MISMATCH";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0122': // UK Passport - DOC_NUMBER_INVALID
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0122 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0122.session_id = sessionId;
                        VALID_RESPONSE_NFC_0122.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0122.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0122.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0122,
                            checks: VALID_RESPONSE_NFC_0122.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "DOC_NUMBER_INVALID";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0123': // UK Passport - CHIP_DATA_INTEGRITY_FAILED
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0123 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0123.session_id = sessionId;
                        VALID_RESPONSE_NFC_0123.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0123.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0123.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0123,
                            checks: VALID_RESPONSE_NFC_0123.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "CHIP_DATA_INTEGRITY_FAILED";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0124': // UK Passport - CHIP_SIGNATURE_VERIFICATION_FAILED
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0124 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0124.session_id = sessionId;
                        VALID_RESPONSE_NFC_0124.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0124.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0124.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0124,
                            checks: VALID_RESPONSE_NFC_0124.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "CHIP_SIGNATURE_VERIFICATION_FAILED";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0125': // UK Passport - CHIP_CSCA_VERIFICATION_FAILED
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0125 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0125.session_id = sessionId;
                        VALID_RESPONSE_NFC_0125.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0125.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0125.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0125,
                            checks: VALID_RESPONSE_NFC_0125.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "CHIP_CSCA_VERIFICATION_FAILED";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));


                    case '0126': // UK Passport - IBV_VISUAL_REVIEW_CHECK
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0126 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0126.session_id = sessionId;
                        VALID_RESPONSE_NFC_0126.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0126.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0126.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0126,
                            checks: VALID_RESPONSE_NFC_0126.checks.map((check: any) => {
                                if (check.type === "IBV_VISUAL_REVIEW_CHECK") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "IBV_VISUAL_REVIEW_CHECK";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0127': // UK Passport - DOCUMENT_SCHEME_VALIDITY_CHECK
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0127 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0127.session_id = sessionId;
                        VALID_RESPONSE_NFC_0127.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0127.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0127.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0127,
                            checks: VALID_RESPONSE_NFC_0127.checks.map((check: any) => {
                                if (check.type === "DOCUMENT_SCHEME_VALIDITY_CHECK") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "DOCUMENT_SCHEME_VALIDITY_CHECK";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0128': // UK Passport - PROFILE_DOCUMENT_MATCH
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0128 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0128.session_id = sessionId;
                        VALID_RESPONSE_NFC_0128.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0128.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0128.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0128,
                            checks: VALID_RESPONSE_NFC_0128.checks.map((check: any) => {
                                if (check.type === "PROFILE_DOCUMENT_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "PROFILE_DOCUMENT_MATCH";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0129': // UK Passport Success -JOYCE
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0129 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0129.session_id = sessionId;
                        VALID_RESPONSE_NFC_0129.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0129.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0129.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID_JOYCE);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0129));

                    case '0130': // UK Passport Success -PAUL
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0130 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0130.session_id = sessionId;
                        VALID_RESPONSE_NFC_0130.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0130.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0130.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID_PAUL);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0130));

                    case '0131': // UK Passport Success -ANTHONY
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0131 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0131.session_id = sessionId;
                        VALID_RESPONSE_NFC_0131.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0131.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0131.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID_ANTHONY);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0131));

                    case '0132': // UK Passport Success -SUZIE
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0132 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0132.session_id = sessionId;
                        VALID_RESPONSE_NFC_0132.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0132.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0132.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID_SUZIE);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0132));

                    case '0133': // UK Passport Success - document_fields object 2nd in list of resources
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const DOCUMENT_FIELDS_SECOND_1033 = JSON.parse(JSON.stringify(DOCUMENT_FIELDS_SECOND));

                        DOCUMENT_FIELDS_SECOND_1033.session_id = sessionId;
                        DOCUMENT_FIELDS_SECOND_1033.resources.id_documents[1].document_fields.media.id = sessionId;
                        DOCUMENT_FIELDS_SECOND_1033.resources.id_documents[1].document_fields.media.id = replaceLastUuidChars(DOCUMENT_FIELDS_SECOND_1033.resources.id_documents[1].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(DOCUMENT_FIELDS_SECOND_1033));

                    case '0134': // UK Passport Success - Multiple document_fields objects in list of resources
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const MULTIPLE_DOCUMENT_FIELDS_1034 = JSON.parse(JSON.stringify(MULTIPLE_DOCUMENT_FIELDS));

                        MULTIPLE_DOCUMENT_FIELDS_1034.session_id = sessionId;
                        MULTIPLE_DOCUMENT_FIELDS_1034.resources.id_documents[0].document_fields.media.id = sessionId;
                        MULTIPLE_DOCUMENT_FIELDS_1034.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(MULTIPLE_DOCUMENT_FIELDS_1034.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(MULTIPLE_DOCUMENT_FIELDS_1034));

                    case '0150': // UK Passport Success - Only FullName in DocumentFields
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0150 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0150.session_id = sessionId;
                        VALID_RESPONSE_NFC_0150.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0150.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0150.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_ONLY_FULLNAME_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0150));

                    case '0151': // UK Passport Success - Only FullName & GivenName in DocumentFields
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0151 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0151.session_id = sessionId;
                        VALID_RESPONSE_NFC_0151.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0151.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0151.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_GIVEN_NAME_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0151));

                    case '0152': // UK Passport Success - Only FullName & FamilyName in DocumentFields
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0152 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0152.session_id = sessionId;
                        VALID_RESPONSE_NFC_0152.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0152.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0152.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_FAMILY_NAME_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0152));

                    case '0153': // UK Passport Success - Wrong Split of GivenNames in DocumentFields
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0153 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0153.session_id = sessionId
                        VALID_RESPONSE_NFC_0153.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0153.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0153.resources.id_documents[0].document_fields.media.id, UK_PASSPORT_GIVEN_NAME_WRONG_SPLIT);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0153));

                    case '0160': // UK Passport - manual text extraction failed
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0160 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        delete VALID_RESPONSE_NFC_0160.resources.id_documents[0].document_fields;
                        VALID_RESPONSE_NFC_0160.checks = [
                            ...VALID_RESPONSE_NFC_0160.checks,
                            {
                                type: "ID_DOCUMENT_TEXT_DATA_CHECK",
                                id: "5c62d223-a1a4-44fa-a5df-0e0bda404ff6",
                                state: "DONE",
                                resources_used: [
                                    "034e9981-bd92-4b8f-8e6f-081516a52f00"
                                ],
                                generated_media: [],
                                report: {
                                    "recommendation": {
                                        "value": "NOT_AVAILABLE",
                                        "reason": "PHOTO_TOO_BLURRY"
                                    },
                                    "breakdown": []
                                },
                                created: "2023-05-23T14:54:00Z",
                                last_updated: "2023-05-23T14:55:32Z"
                            },
                        ];
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0160));
                    default:
                        return undefined;
                }
            }

            if (firstTwoChars === DocumentMapping.NON_UK_PASSPORT) { // Non-UK - Passport Scenarios
                switch (lastUuidChars) {
                    case '0200': // Non-UK Passport Success - Chip Readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0200 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0200.session_id = sessionId;
                        VALID_RESPONSE_NFC_0200.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0200.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0200.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        VALID_RESPONSE_NFC_0200.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0200));

                    case '0201': // Non-UK Passport Success - Chip NOT readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_0201 = JSON.parse(JSON.stringify(VALID_RESPONSE));

                        VALID_RESPONSE_0201.session_id = sessionId;
                        VALID_RESPONSE_0201.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_0201.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_0201.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        VALID_RESPONSE_0201.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_0201));

                    case '0202': // Non-UK Passport Success - Chip Readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const AI_FAIL_MANUAL_PASS_0202 = JSON.parse(JSON.stringify(AI_FAIL_MANUAL_PASS));

                        AI_FAIL_MANUAL_PASS_0202.session_id = sessionId;
                        AI_FAIL_MANUAL_PASS_0202.resources.id_documents[0].document_fields.media.id = sessionId;
                        AI_FAIL_MANUAL_PASS_0202.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_FAIL_MANUAL_PASS_0202.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        AI_FAIL_MANUAL_PASS_0202.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(AI_FAIL_MANUAL_PASS_0202));

                    case '0203': // Non-UK Passport Success - Chip NOT readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const AI_PASS_0203 = JSON.parse(JSON.stringify(AI_PASS));

                        AI_PASS_0203.session_id = sessionId;
                        AI_PASS_0203.resources.id_documents[0].document_fields.media.id = sessionId;
                        AI_PASS_0203.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(AI_PASS_0203.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        AI_PASS_0203.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(AI_PASS_0203));

                    case '0204': // Non-UK Passport Fails due to FACE_NOT_GENUINE
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0204 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0204.session_id = sessionId;
                        VALID_RESPONSE_NFC_0204.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0204.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0204.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0204,
                            checks: VALID_RESPONSE_NFC_0204.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "FACE_NOT_GENUINE";
                                }
                                return check;
                            }),
                        };
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));
                    case '0205': // Non-UK Passport - ID_DOCUMENT_AUTHENTICITY
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_RESPONSE_NFC_0205 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                        VALID_RESPONSE_NFC_0205.session_id = sessionId;
                        VALID_RESPONSE_NFC_0205.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_RESPONSE_NFC_0205.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0205.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_MEDIA_ID);
                        modifiedPayload = {
                            ...VALID_RESPONSE_NFC_0205,
                            checks: VALID_RESPONSE_NFC_0205.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_AUTHENTICITY") {
                                    check.report.recommendation.value = "REJECT";
                                    check.report.recommendation.reason = "ISSUING_AUTHORITY_INVALID";
                                }
                                return check;
                            }),
                        };
                        console.log('modifiedPayload', JSON.stringify(modifiedPayload));
                        return new Response(HttpCodesEnum.OK, JSON.stringify(modifiedPayload));

                    case '0206': // Non-UK Passport Success - Surnames Split Incorrectly
                    logger.debug(JSON.stringify(yotiSessionRequest));
                    const VALID_RESPONSE_NFC_0206 = JSON.parse(JSON.stringify(VALID_RESPONSE_NFC));

                    VALID_RESPONSE_NFC_0206.session_id = sessionId;
                    VALID_RESPONSE_NFC_0206.resources.id_documents[0].document_fields.media.id = sessionId;
                    VALID_RESPONSE_NFC_0206.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_RESPONSE_NFC_0206.resources.id_documents[0].document_fields.media.id, NON_UK_PASSPORT_WRONG_SPLIT_SURNAME);
                    VALID_RESPONSE_NFC_0206.resources.id_documents[0].issuing_country = "ESP";
                    return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE_NFC_0206));

                    default:
                        return undefined;
                }
            }

            if (firstTwoChars === DocumentMapping.EU_DL) { // EU - Driving Licence Scenarios
                switch (lastUuidChars) {
                    case '0400': // EU Driving Licence Success - Face Match Automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0400 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));

                        VALID_DL_RESPONSE_0400.session_id = sessionId;
                        VALID_DL_RESPONSE_0400.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_DL_RESPONSE_0400.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0400.resources.id_documents[0].document_fields.media.id, EU_DL_MEDIA_ID);
                        VALID_DL_RESPONSE_0400.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0400));

                    case '0401':// EU Driving Licence Success & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0401 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));

                        VALID_DL_RESPONSE_0401.session_id = sessionId;
                        VALID_DL_RESPONSE_0401.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_DL_RESPONSE_0401.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0401.resources.id_documents[0].document_fields.media.id, EU_DL_MEDIA_ID);
                        VALID_DL_RESPONSE_0401.resources.id_documents[0].issuing_country = "ESP";
                        const updatedPayload = {
                            ...VALID_DL_RESPONSE_0401,
                            checks: VALID_DL_RESPONSE_0401.checks.map((check: any) => {
                                if (check.type === "ID_DOCUMENT_FACE_MATCH") {
                                    return {
                                        ...check,
                                        report: {
                                            ...check.report,
                                            breakdown: [
                                                {
                                                    "sub_check": "ai_face_match",
                                                    "result": "FAIL",
                                                    "details": [
                                                        {
                                                            "name": "confidence_score",
                                                            "value": "0.02"
                                                        }
                                                    ],
                                                    "process": "AUTOMATED"
                                                },
                                                {
                                                    sub_check: "manual_face_match",
                                                    result: "PASS",
                                                    details: [],
                                                    process: "EXPERT_REVIEW"
                                                }
                                            ]
                                        }
                                    };
                                }
                                return check;
                            })
                        };
                        return new Response(HttpCodesEnum.OK, JSON.stringify(updatedPayload));

                        case '0402': // EU Driving Licence Success - Incorrect Sequence of Names
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const VALID_DL_RESPONSE_0402 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));

                        VALID_DL_RESPONSE_0402.session_id = sessionId;
                        VALID_DL_RESPONSE_0402.resources.id_documents[0].document_fields.media.id = sessionId;
                        VALID_DL_RESPONSE_0402.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0402.resources.id_documents[0].document_fields.media.id, EU_DL_INCORRECT_NAME_SEQUENCE);
                        VALID_DL_RESPONSE_0402.resources.id_documents[0].issuing_country = "ESP";
                        return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0402));

                    default:
                        return undefined;
                }
            }

            if (firstTwoChars === DocumentMapping.EEA_ID) { // EEA National ID Card Scenarios
                switch (lastUuidChars) {
                    case '0500': // EEA Success - Chip Readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const EEA_VALID_RESPONSE_NFC_0500 = JSON.parse(JSON.stringify(EEA_VALID_RESPONSE_NFC));

                        EEA_VALID_RESPONSE_NFC_0500.session_id = sessionId;
                        EEA_VALID_RESPONSE_NFC_0500.resources.id_documents[0].document_fields.media.id = sessionId;
                        EEA_VALID_RESPONSE_NFC_0500.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EEA_VALID_RESPONSE_NFC_0500.resources.id_documents[0].document_fields.media.id, EEA_ID_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(EEA_VALID_RESPONSE_NFC_0500));

                    case '0501': // EEA Success - Chip NOT Readable & Face Match automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const EEA_AI_MATCH_NO_CHIP_0501 = JSON.parse(JSON.stringify(EEA_AI_MATCH_NO_CHIP));

                        EEA_AI_MATCH_NO_CHIP_0501.session_id = sessionId;
                        EEA_AI_MATCH_NO_CHIP_0501.resources.id_documents[0].document_fields.media.id = sessionId;
                        EEA_AI_MATCH_NO_CHIP_0501.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EEA_AI_MATCH_NO_CHIP_0501.resources.id_documents[0].document_fields.media.id, EEA_ID_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(EEA_AI_MATCH_NO_CHIP_0501));

                    case '0502': // EEA Success - Chip Readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const EEA_AI_FAIL_MANUAL_PASS_0502 = JSON.parse(JSON.stringify(EEA_AI_FAIL_MANUAL_PASS));

                        EEA_AI_FAIL_MANUAL_PASS_0502.session_id = sessionId;
                        EEA_AI_FAIL_MANUAL_PASS_0502.resources.id_documents[0].document_fields.media.id = sessionId;
                        EEA_AI_FAIL_MANUAL_PASS_0502.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EEA_AI_FAIL_MANUAL_PASS_0502.resources.id_documents[0].document_fields.media.id, EEA_ID_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(EEA_AI_FAIL_MANUAL_PASS_0502));

                    case '0503': // EEA Success - Chip NOT Readable & Face Match NOT automated
                        logger.debug(JSON.stringify(yotiSessionRequest));
                        const EEA_MANUAL_PASS_0503 = JSON.parse(JSON.stringify(EEA_MANUAL_PASS));

                        EEA_MANUAL_PASS_0503.session_id = sessionId;
                        EEA_MANUAL_PASS_0503.resources.id_documents[0].document_fields.media.id = sessionId;
                        EEA_MANUAL_PASS_0503.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(EEA_MANUAL_PASS_0503.resources.id_documents[0].document_fields.media.id, EEA_ID_MEDIA_ID);
                        return new Response(HttpCodesEnum.OK, JSON.stringify(EEA_MANUAL_PASS_0503));

                    default:
                        return undefined;
                }
            }
        };

       
         

        const replaceLastUuidChars = (str: string, lastUuidChars: string): string => {
            return str.replace(/\d{4}$/, lastUuidChars);
        };
        

        // without this bit, the API won't run scenarios for the different document types
        if ((lastUuidChars.substring(0, 2) === '00') || (lastUuidChars.substring(0, 2) === '01') || (lastUuidChars.substring(0, 2) === '02') ||
            (lastUuidChars.substring(0, 2) === '03') || (lastUuidChars.substring(0, 2) === '04') || (lastUuidChars.substring(0, 2) === '05')) {
            const response = processPositiveScenario(lastUuidChars, sessionId);
            if (response) {
                return response;
            }
        }

         
        // Retry scenarios
        const yotiSessionRequest = new YotiSessionRequest(sessionId);
        
        switch (lastUuidChars) {
            case '0429': // UK Driving License Success - Face Match automated - first attempt 429 error, second attempt 200
                this.logger.debug(JSON.stringify(yotiSessionRequest));
                const VALID_DL_RESPONSE_0429 = JSON.parse(JSON.stringify(VALID_DL_RESPONSE));
                VALID_DL_RESPONSE_0429.session_id = sessionId;
                VALID_DL_RESPONSE_0429.resources.id_documents[0].document_fields.media.id = sessionId; 
                VALID_DL_RESPONSE_0429.resources.id_documents[0].document_fields.media.id = replaceLastUuidChars(VALID_DL_RESPONSE_0429.resources.id_documents[0].document_fields.media.id, UK_DL_MEDIA_ID);
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `fetchSessionInfo - Retrying to fetch Yoti session. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch session info", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_YOTI_GET_SESSION", xRequestId: "dummy-request-id" });
                await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_DL_RESPONSE_0429));
        }

        // Error scenarios
        switch (lastUuidChars) {
            case '5400':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(POST_SESSIONS_400), ERROR_RESPONSE_HEADERS);
            case '5401':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(POST_SESSIONS_401), ERROR_RESPONSE_HEADERS);
            case '5404':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(POST_SESSIONS_404), ERROR_RESPONSE_HEADERS);
            case '5429':
                this.logger.info({message: "Responding with 429 error response", lastUuidChars});
                return new Response(HttpCodesEnum.TOO_MANY_REQUESTS, JSON.stringify(GET_SESSIONS_429), ERROR_RESPONSE_HEADERS);
            case '5999':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                await sleep(30000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_RESPONSE));
            case '5503':
                this.logger.info({message: "Responding with 503 error response", lastUuidChars});
                return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(GET_SESSIONS_503), ERROR_RESPONSE_HEADERS);
            case '1060':
                this.logger.info({message: "Yoti document_fields not populated", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(YOTI_DOCUMENT_FIELDS_NOT_POPULATED_500), ERROR_RESPONSE_HEADERS);
            case '1061':
                this.logger.info({message: "Multiple document_fields in response", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(MULTIPLE_DOCUMENT_FIELDS_IN_RESPONSE_500), ERROR_RESPONSE_HEADERS);
            case '1062':
                this.logger.info({message: "Yoti document_fields media ID not found", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(YOTI_DOCUMENT_FIELDS_MEDIA_ID_NOT_FOUND_500), ERROR_RESPONSE_HEADERS);
                    
            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }
    }

    /***
     * GET /sessions/{id}/configuration
     * @param sessionId
     */
    async getSessionConfiguration(sessionId: string): Promise<Response> {

        const lastUuidChars = sessionId.slice(-4);
        const firstTwoChars = lastUuidChars.slice(0, 2);
        this.logger.info({message: "last 4 ID chars", lastUuidChars});

        this.logger.info("getSessionConfiguration", { SUPPORTED_DOCUMENTS });

        if (SUPPORTED_DOCUMENTS.includes(firstTwoChars)) {
            VALID_GET_SESSION_CONFIG_RESPONSE.session_id = sessionId;
            this.logger.info("Getting Session Config", JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
            return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
        }

        switch (lastUuidChars) {
            case '2400':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_SESSIONS_CONFIG_400), ERROR_RESPONSE_HEADERS);
            case '2401':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_SESSIONS_CONFIG_401), ERROR_RESPONSE_HEADERS);
            case '2404':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_SESSIONS_CONFIG_404), ERROR_RESPONSE_HEADERS);
            case '2409':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(GET_SESSIONS_CONFIG_409), ERROR_RESPONSE_HEADERS);
            case '2503':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(GET_SESSIONS_CONFIG_503), ERROR_RESPONSE_HEADERS);
            case '2999':
                // This will result in 504 timeout currently as sleep interval is 30s
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                await sleep(30000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
            // retries
            case '2429':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `fetchSessionInfo - Retrying to fetch Yoti session. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch session info", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_YOTI_GET_SESSION", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
            case '2500':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `fetchSessionInfo - Retrying to fetch Yoti session. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch session info", yotiErrorCode: 500, yotiErrorStatus: 500, messageCode: "FAILED_YOTI_GET_SESSION", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_GET_SESSION_CONFIG_RESPONSE));
            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }
    }

    /***
     * PUT /sessions/{id}/instructions
     * @param sessionId
     */
    async updateSessionInstructions(sessionId: string, fadCode: string): Promise<Response> {
        const lastUuidChars = sessionId.slice(-4);
        const firstTwoChars = lastUuidChars.slice(0, 2);
        this.logger.info({message: "last 4 ID chars", lastUuidChars});

        const validFadCodeFormat = /^[a-zA-Z0-9]{7}$/;
        const lastFadCodeChars = fadCode.slice(-4);

        this.logger.info("getSessionConfiguration", { SUPPORTED_DOCUMENTS });

        if (!fadCode) {
            this.logger.info("Fad Code not included", JSON.stringify(FAD_CODE_NOT_INCLUDED));
            return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(FAD_CODE_NOT_INCLUDED), ERROR_RESPONSE_HEADERS);
        } else if (!validFadCodeFormat.test(fadCode)) {
            this.logger.info("Fad Code format incorrect", JSON.stringify(FAD_CODE_INCORRECT_FORMAT));
            return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(FAD_CODE_INCORRECT_FORMAT), ERROR_RESPONSE_HEADERS);
        } else if (lastFadCodeChars === 'XXXX') {
            this.logger.info("Fad Code invalid", JSON.stringify(FAD_CODE_INVALID));
            return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(FAD_CODE_INVALID), ERROR_RESPONSE_HEADERS);
        }
        
        if (SUPPORTED_DOCUMENTS.includes(firstTwoChars)) {
            this.logger.info("Put Instructions Response", JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
        }

        switch (lastUuidChars) {
            case '3400':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(PUT_INSTRUCTIONS_400), ERROR_RESPONSE_HEADERS)
            case '3401':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(PUT_INSTRUCTIONS_401), ERROR_RESPONSE_HEADERS)
            case '3404':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(PUT_INSTRUCTIONS_404), ERROR_RESPONSE_HEADERS)
            case '3409':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(PUT_INSTRUCTIONS_409), ERROR_RESPONSE_HEADERS)
            case '3503':
                return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(PUT_INSTRUCTIONS_500), ERROR_RESPONSE_HEADERS);
            case '3999':
                // This will result in 504 timeout currently as sleep interval is 30s
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                await new Promise(resolve => setTimeout(resolve, 30000));
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            // retries
             case '3429':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `generateInstructions - Retrying to generate Yoti instructions PDF. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to generate instructions", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_YOTI_PUT_INSTRUCTIONS", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            case '3500':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `generateInstructions - Retrying to generate Yoti instructions PDF. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to generate instructions", yotiErrorCode: 500, yotiErrorStatus: 500, messageCode: "FAILED_YOTI_PUT_INSTRUCTIONS", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }
    }

    /***
     * GET /sessions/{sessionId}/instructions/pdf
     */
    async fetchInstructionsPdf(sessionId: string): Promise<any> {

        let pdfBytes;
        let successResp;
        const VALID_GET_INSTRUCTIONS_RESPONSE = {
                headers: {
                    'Content-Type': "application/octet-stream",
                    "Access-Control-Allow-Origin":"*",
                    'Accept': 'application/pdf'},
                statusCode: 200,
                body: pdfBytes,
                isBase64Encoded: true
            }
        const lastUuidChars = sessionId.slice(-4);
        const firstTwoChars = lastUuidChars.slice(0, 2);
        this.logger.info({message: "last 4 ID chars", lastUuidChars});
        try {
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();

            page.moveTo(5, 200)
            page.drawText("This is a demo page generated by Yoti Stub");
            pdfBytes = await pdfDoc.saveAsBase64()
            successResp = VALID_GET_INSTRUCTIONS_RESPONSE

            if (SUPPORTED_DOCUMENTS.includes(firstTwoChars)) {
                this.logger.info("fetchInstructionsPdf",JSON.stringify(successResp));
                return successResp;
            }

        } catch (err) {
            console.log("Got err " + err)
            throw err;
        }

        switch (lastUuidChars) {
            case '4400':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_INSTRUCTIONS_PDF_400), ERROR_RESPONSE_HEADERS);
            case '4401':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_INSTRUCTIONS_PDF_401), ERROR_RESPONSE_HEADERS);
            case '4404':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_INSTRUCTIONS_PDF_404), ERROR_RESPONSE_HEADERS);
            case '4409':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.CONFLICT, JSON.stringify(GET_INSTRUCTIONS_PDF_409), ERROR_RESPONSE_HEADERS);
            case '4500':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(GET_INSTRUCTIONS_PDF_500), ERROR_RESPONSE_HEADERS);
            case '4503':
                return new Response(HttpCodesEnum.SERVICE_UNAVAILABLE, JSON.stringify(GET_INSTRUCTIONS_PDF_503), ERROR_RESPONSE_HEADERS);
            case '4999':
                // This will result in 504 timeout currently as sleep interval is 30s
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                await sleep(30000);
                return successResp;
            // retries
            case '4429':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `fetchInstructionsPdf - Retrying to fetch Yoti instructions PDF. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch instructions PDF", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_YOTI_GET_INSTRUCTIONS", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            case '4501':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `fetchInstructionsPdf - Retrying to fetch Yoti instructions PDF. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch instructions PDF", yotiErrorCode: 500, yotiErrorStatus: 500, messageCode: "FAILED_YOTI_GET_INSTRUCTIONS", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(VALID_PUT_INSTRUCTIONS_RESPONSE));
            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming yotiSessionId ${sessionId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }

    }

    /***
     * GET /sessions/{sessionId}/media/{mediaId}/content
     */
    async getMediaContent(mediaId: string): Promise<Response> {
        const lastUuidChars = mediaId.slice(-4);
        const logger = this.logger;
        logger.info({message: "last 4 ID chars", lastUuidChars});

        switch (lastUuidChars) {
            case UK_DL_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE));

            case UK_DL_WRONG_NON_SPACE_CHARS:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE_NON_SPACE_CHARS_RETURNED_WRONG));

            case UK_PASSPORT_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT));

            case UK_PASSPORT_MEDIA_ID_JOYCE:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_JOYCE));

            case UK_PASSPORT_ONLY_FULLNAME_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_ONLY_FULLNAME));

			case UK_PASSPORT_GIVEN_NAME_MEDIA_ID:
				return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_GIVEN_NAME));

			case UK_PASSPORT_FAMILY_NAME_MEDIA_ID:
				return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_FAMILY_NAME));

            case UK_PASSPORT_GIVEN_NAME_WRONG_SPLIT:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_WRONG_SPLIT_GIVEN_NAME));

            case UK_PASSPORT_MEDIA_ID_PAUL:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_PAUL));

            case UK_PASSPORT_MEDIA_ID_ANTHONY:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_ANTHONY));

            case UK_PASSPORT_MEDIA_ID_SUZIE:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT_SUZIE));

            case NON_UK_PASSPORT_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(ESP_PASSPORT));

            case NON_UK_PASSPORT_WRONG_SPLIT_SURNAME:
                return new Response(HttpCodesEnum.OK, JSON.stringify(ESP_PASSPORT_WRONG_SPLIT_SURNAMES));

            case EU_DL_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(DEU_DRIVING_LICENCE));

            case EU_DL_INCORRECT_NAME_SEQUENCE:
                return new Response(HttpCodesEnum.OK, JSON.stringify(DEU_DRIVING_LICENCE_INCORRECT_NAME_SEQUENCE));

            case EEA_ID_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(NLD_NATIONAL_ID));
            
            case UK_DL_MISSING_FORMATTED_ADDRESS_MEDIA_ID:
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE_MISSING_FORMATTED_ADDRESS));

            case YOTI_DOCUMENT_FIELDS_INFO_NOT_FOUND:
                logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(YOTI_DOCUMENT_FIELDS_INFO_NOT_FOUND_500), ERROR_RESPONSE_HEADERS);

            case MISSING_NAME_INFO_IN_DOCUMENT_FIELDS:
                logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.SERVER_ERROR, JSON.stringify(MISSING_NAME_INFO_IN_DOCUMENT_FIELDS_500), ERROR_RESPONSE_HEADERS);

            case '5400':
                logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.BAD_REQUEST, JSON.stringify(GET_MEDIA_CONTENT_400), ERROR_RESPONSE_HEADERS);

            case '5401':
                logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.UNAUTHORIZED, JSON.stringify(GET_MEDIA_CONTENT_401), ERROR_RESPONSE_HEADERS);

            case '5404':
                logger.info({message: "last 4 ID chars", lastUuidChars});
                return new Response(HttpCodesEnum.NOT_FOUND, JSON.stringify(GET_MEDIA_CONTENT_404), ERROR_RESPONSE_HEADERS);

            case '5999':
                // This will result in 504 timeout currently as sleep interval is 30s
                logger.info({message: "last 4 ID chars", lastUuidChars});
                await sleep(30000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_PASSPORT));
            
            // retries
            case '6429':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `getMediaContent - Retrying to fetch Yoti media content. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch media content", yotiErrorCode: 429, yotiErrorStatus: 429, messageCode: "FAILED_YOTI_GET_MEDIA_CONTENT", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE));

            case '6500':
                this.logger.info({message: "last 4 ID chars", lastUuidChars});
                this.logger.warn({ message: `getMediaContent - Retrying to fetch Yoti media content. Sleeping for 5000 ms`, retryCount: 0, yotiErrorMessage: "Failed to fetch media content", yotiErrorCode: 500, yotiErrorStatus: 500, messageCode: "FAILED_YOTI_GET_MEDIA_CONTENT", xRequestId: "dummy-request-id" });
    		    await sleep(5000);
                return new Response(HttpCodesEnum.OK, JSON.stringify(GBR_DRIVING_LICENCE));

            default:
                return new Response(HttpCodesEnum.SERVER_ERROR, `Incoming mediaId ${mediaId} didn't match any of the use cases`, ERROR_RESPONSE_HEADERS);
        }
    }
}
