/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/dot-notation */
/* eslint-disable @typescript-eslint/unbound-method */
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { getParameter } from "../../../utils/Config";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "../../../services/DocumentSelectionRequestProcessor";
import {
	VALID_EEA_ID_CARD_REQUEST,
	VALID_NON_UK_PASSPORT_REQUEST,
	VALID_REQUEST,
	MISSING_PDF_PREFERENCE,
	MISSING_UPRN,
	MISSING_BUILDING_NUMBER_AND_BUILDING_NAME,
	MISSING_STREET_NAME,
	MISSING_ADDRESS_LOCALITY,
	MISSING_ADDRESS_COUNTRY,
	MISSING_POSTAL_CODE,
	MISSING_PREFERRED_ADDRESS,
} from "../data/documentSelection-events";
import { YotiService } from "../../../services/YotiService";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { YotiSessionInfo } from "../../../models/YotiPayloads";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { TXMA_NATIONAL_ID_YOTI_START, TXMA_PASSPORT_YOTI_START } from "../data/txmaEvent";
import { PdfPreferenceEnum } from "../../../utils/PdfPreferenceEnum";
import { APIGatewayProxyResult } from "aws-lambda";


let mockDocumentSelectionRequestProcessor: DocumentSelectionRequestProcessor;
const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();

const logger = mock<Logger>();
const metrics = mock<Metrics>();
const encodedHeader = "ENCHEADER";

function getMockSessionItem(): ISessionItem {
	const sessionInfo: ISessionItem = {
		sessionId: "RandomF2FSessionID",
		clientId: "ipv-core-stub",
		// pragma: allowlist nextline secret
		accessToken: "AbCdEf123456",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 0,
		redirectUri: "http://localhost:8085/callback",
		accessTokenExpiryDate: 0,
		expiryDate: 221848913376,
		createdDate: 1675443004,
		state: "Y@atr",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

function getPersonIdentityItem(): PersonIdentityItem {
	const personIdentityItem: PersonIdentityItem = {
		"addresses": [
			{
				"addressCountry": "GB",
				"buildingName": "Sherman",
				"uprn": 123456789,
				"streetName": "Wallaby Way",
				"postalCode": "F1 1SH",
				"buildingNumber": "32",
				"addressLocality": "Sidney",
				"preferredAddress": true,
			},
		],
		"sessionId": "RandomF2FSessionID",
		"emailAddress": "viveak.vadivelkarasan@digital.cabinet-office.gov.uk",
		"birthDate": [
			{
				"value":"1960-02-02",
			},
		],
		"name": [
			{
				"nameParts": [
					{
						"type": "GivenName",
						"value": "Frederick",
					},
					{
						"type": "GivenName",
						"value": "Joseph",
					},
					{
						"type": "FamilyName",
						"value": "Flintstone",
					},
				],
			},
		],
		"pdfPreference": PdfPreferenceEnum.EMAIL_ONLY,
		expiryDate: 1612345678,
		createdDate: 1612335678,
	};
	return personIdentityItem;
}

function getYotiSessionInfo(): YotiSessionInfo {
	const yotiSessionInfo: YotiSessionInfo = {
		"session_id":"RandomYotiSessionID",
		"client_session_token_ttl":1382400,
		"requested_checks":[
			 "IBV_VISUAL_REVIEW_CHECK",
			 "DOCUMENT_SCHEME_VALIDITY_CHECK",
			 "PROFILE_DOCUMENT_MATCH",
		],
		"applicant_profile":{
			 "media":{
				"id":"c98cc2f5-9e91-41f9-8fdc-e0307ec5bca2",
				"type":"JSON",
				"created":"2023-04-05T19:56:44Z",
				"last_updated":"2023-04-05T19:56:44Z",
			 },
		},
		"capture":{
			 "required_resources":[
				{
						 "type":"ID_DOCUMENT",
						 "id":"d8678fef-b6ab-47a6-9afd-50521679d051",
						 "state":"REQUIRED",
						 "allowed_sources":[
						{
							"type":"IBV",
						},
						 ],
						 "requested_tasks":[

						 ],
						 "ibv_client_assessments":[
						{
							"type":"IBV_VISUAL_REVIEW_CHECK",
							"state":"REQUIRED",
						},
						{
							"type":"DOCUMENT_SCHEME_VALIDITY_CHECK",
							"state":"REQUIRED",
							"scheme":"UK_GDS",
						},
						{
							"type":"PROFILE_DOCUMENT_MATCH",
							"state":"REQUIRED",
						},
						 ],
						 "supported_countries":[
						{
									 "code":"GBR",
									 "supported_documents":[
								{
												 "type":"PASSPORT",
								},
									 ],
						},
						 ],
						 "allowed_capture_methods":"CAMERA",
						 "attempts_remaining":{
						"RECLASSIFICATION":2,
						"GENERIC":2,
						 },
				},
			 ],
			 "biometric_consent":"NOT_REQUIRED",
		},
		"sdk_config":{
			 "primary_colour":"#D71440",
			 "locale":"en-GB",
			 "hide_logo":false,
			 "allow_handoff":false,
		},
		"track_ip_address":true,
	};
	return yotiSessionInfo;
}

jest.mock("@aws-sdk/client-sfn", () => ({
	SFNClient: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	StartExecutionCommand: jest.fn().mockImplementation((params) => params),
}));

jest.mock("../../../utils/Config", () => ({
	getParameter: jest.fn(),
}));

describe("DocumentSelectionRequestProcessor", () => {
	let personIdentityItem: PersonIdentityItem, f2fSessionItem: ISessionItem, yotiSessionInfo: YotiSessionInfo;
	beforeAll(() => {
		mockDocumentSelectionRequestProcessor = new DocumentSelectionRequestProcessor(logger, metrics, "YOTIPRIM");
		// @ts-ignore
		mockDocumentSelectionRequestProcessor.f2fService = mockF2fService;

		YotiService.getInstance = jest.fn(() => mockYotiService);

		yotiSessionInfo = getYotiSessionInfo();
		f2fSessionItem = getMockSessionItem();
		metrics.singleMetric.mockReturnValue(metrics);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000));
		personIdentityItem = getPersonIdentityItem();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		const passportYotiStart = TXMA_PASSPORT_YOTI_START;
		passportYotiStart.event_name = "F2F_YOTI_START";
		passportYotiStart.timestamp = 1585695600;
		passportYotiStart.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, passportYotiStart, encodedHeader);
		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(mockF2fService.updateSessionWithYotiIdAndStatus).toHaveBeenCalledWith("RandomF2FSessionID", "b83d54ce-1565-42ee-987a-97a1f48f27dg", "F2F_YOTI_SESSION_CREATED");
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});

	it("Should return successful response with 200 OK when non-UK passport used for YOTI session", async () => {
		yotiSessionInfo.capture.required_resources[0].supported_countries[0].code = "ESP";
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_NON_UK_PASSPORT_REQUEST, "RandomF2FSessionID", encodedHeader);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		const passportYotiStart =  TXMA_PASSPORT_YOTI_START;
		passportYotiStart.event_name = "F2F_YOTI_START";
		passportYotiStart.timestamp = 1585695600;
		passportYotiStart.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, passportYotiStart, encodedHeader);
		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(mockF2fService.updateSessionWithYotiIdAndStatus).toHaveBeenCalledWith("RandomF2FSessionID", "b83d54ce-1565-42ee-987a-97a1f48f27dg", "F2F_YOTI_SESSION_CREATED");
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});

	it("Should return successful response with 200 OK when an EEA ID Card is used and creates YOTI session", async () => {
		yotiSessionInfo.capture.required_resources[0].supported_countries[0].code = "IRL";
		yotiSessionInfo.capture.required_resources[0].supported_countries[0].supported_documents[0].type = "NATIONAL_ID";

		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_EEA_ID_CARD_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		const nationalIdYotiStart =  TXMA_NATIONAL_ID_YOTI_START;
		nationalIdYotiStart.event_name = "F2F_YOTI_START";
		nationalIdYotiStart.timestamp = 1585695600;
		nationalIdYotiStart.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, nationalIdYotiStart, encodedHeader);
		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(mockF2fService.updateSessionWithYotiIdAndStatus).toHaveBeenCalledWith("RandomF2FSessionID", "b83d54ce-1565-42ee-987a-97a1f48f27dg", "F2F_YOTI_SESSION_CREATED");
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});

	it("Throws bad request error when personDetails is missing", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(undefined);

		await expect(mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION or PERSON IDENTITY tables",
		}));
		expect(logger.warn).toHaveBeenNthCalledWith(1,
			"Missing details in SESSION or PERSON IDENTITY tables", { "messageCode": "SESSION_NOT_FOUND" },
		);
	});

	it("Returns bad request response when pdf_preference is missing from FE payload", async () => {
		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(MISSING_PDF_PREFERENCE, "1234", encodedHeader);
		
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
		expect(out.body).toBe("Missing mandatory fields in request payload");
		expect(logger.error).toHaveBeenCalledWith(
			"Missing mandatory fields (post_office_selection, document_selection.document_selected or pdf_preference) in request payload", { messageCode: "MISSING_MANDATORY_FIELDS" },
		);
		expect(metrics.addDimension).toHaveBeenCalledWith("validation_failure", "missingPdfPreference");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "DocSelect_validation_failed", MetricUnits.Count, 1);
	});

	it.each([
		MISSING_UPRN,
		MISSING_BUILDING_NUMBER_AND_BUILDING_NAME,
		MISSING_STREET_NAME,
		MISSING_ADDRESS_LOCALITY,
		MISSING_ADDRESS_COUNTRY,
		MISSING_POSTAL_CODE,
		MISSING_PREFERRED_ADDRESS,
	])("Returns bad request response when postal_address is present but mandatory fields within postal_address are missing from FE payload", async (payload) => {
		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(payload, "1234", encodedHeader);
		
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
		expect(out.body).toBe("Missing mandatory fields in postal address");
		expect(logger.error).toHaveBeenCalledWith(
			"Postal address missing mandatory fields in postal address", { messageCode: "MISSING_MANDATORY_FIELDS_IN_POSTAL_ADDRESS" },
		);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "DocSelect_missing_mandatory_fields_in_postal_address", MetricUnits.Count, 1);
	});

	it("Should update the TTL on both Session & Person Identity Tables", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.000Z

		await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.updateSessionTtl).toHaveBeenNthCalledWith(1, "RandomF2FSessionID", Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL_SECS!), "SESSIONTABLE");
		expect(mockF2fService.updateSessionTtl).toHaveBeenNthCalledWith(2, "RandomF2FSessionID", Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL_SECS!), "PERSONIDENTITYTABLE");
	});

	it("Should save the documentUsed type in session table", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.addUsersSelectedDocument).toHaveBeenCalledWith("RandomF2FSessionID", "PASSPORT", "SESSIONTABLE");
	});

	it("Throw server error if Yoti Session already exists", async () => {
		const f2fSessionItemInvalid: ISessionItem = {
			...f2fSessionItem,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
			yotiSessionId: "RandomYOTISessionID",
		};
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItemInvalid);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(out.body).toBe("Yoti session already exists for this authorization session or Session is in the wrong state");
		expect(logger.warn).toHaveBeenCalledWith(
			"Yoti session already exists for this authorization session or Session is in the wrong state: F2F_YOTI_SESSION_CREATED", { messageCode: "STATE_MISMATCH" },
		);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "DocSelect_error_user_state_incorrect", MetricUnits.Count, 1);
	});

	it("Returns server error if PersonIdentity table is missing emailAddress", async () => {
		const f2fSessionItemInvalid: ISessionItem = {
			...f2fSessionItem,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
			yotiSessionId: "RandomYOTISessionID",
		};
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItemInvalid);
		personIdentityItem.emailAddress = " ";
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("Missing emailAddress in the PERSON IDENTITY table");
		expect(logger.error).toHaveBeenCalledWith(
			"Missing emailAddress in the PERSON IDENTITY table", { "messageCode": MessageCodes.MISSING_PERSON_EMAIL_ADDRESS },
		);
	});

	it("Returns server error if PersonIdentity table is missing name", async () => {
		const f2fSessionItemInvalid: ISessionItem = {
			...f2fSessionItem,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
			yotiSessionId: "RandomYOTISessionID",
		};
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItemInvalid);
		personIdentityItem.name = [];
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("Missing person's GivenName or FamilyName in the PERSON IDENTITY table");
		expect(logger.error).toHaveBeenCalledWith(
			"Missing person's GivenName or FamilyName in the PERSON IDENTITY table", { "messageCode": MessageCodes.MISSING_PERSON_IDENTITY_NAME },
		);
	});

	it("Returns server error if GivenName is empty in the PersonIdentity table", async () => {
		const f2fSessionItemInvalid: ISessionItem = {
			...f2fSessionItem,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
			yotiSessionId: "RandomYOTISessionID",
		};
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItemInvalid);
		personIdentityItem.name = [
			{
				nameParts: [
					{
						type: "GivenName",
						value: " ",
					},
					{
						type: "FamilyName",
						value: "Flintstone",
					},
				],
			},
		];
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("Missing person's GivenName or FamilyName in the PERSON IDENTITY table");
		expect(logger.error).toHaveBeenCalledWith(
			"Missing person's GivenName or FamilyName in the PERSON IDENTITY table", { "messageCode": MessageCodes.MISSING_PERSON_IDENTITY_NAME },
		);
	});

	it("Returns server error if FamilyName is empty in the PersonIdentity table", async () => {
		const f2fSessionItemInvalid: ISessionItem = {
			...f2fSessionItem,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
			yotiSessionId: "RandomYOTISessionID",
		};
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItemInvalid);
		personIdentityItem.name = [
			{
				nameParts: [
					{
						type: "GivenName",
						value: "Frederick",
					},
					{
						type: "FamilyName",
						value: " ",
					},
				],
			},
		];
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("Missing person's GivenName or FamilyName in the PERSON IDENTITY table");
		expect(logger.error).toHaveBeenCalledWith(
			"Missing person's GivenName or FamilyName in the PERSON IDENTITY table", { "messageCode": MessageCodes.MISSING_PERSON_IDENTITY_NAME },
		);
	});

	it("Throw server error if Yoti Session creation fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce(undefined);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error occurred when creating Yoti Session");
		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(1,
			"An error occurred when creating Yoti Session", { "messageCode": "FAILED_CREATING_YOTI_SESSION" },
		);
		expect(logger.error).toHaveBeenNthCalledWith(2,
			"Error occurred during documentSelection orchestration", "An error occurred when creating Yoti Session", { "messageCode": "FAILED_DOCUMENT_SELECTION_ORCHESTRATION" },
		);
	});

	it("Throw server error if Yoti Session info fetch fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(undefined);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe( "An error occurred when fetching Yoti Session");
		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(1,
			"An error occurred when fetching Yoti Session", { "messageCode": "FAILED_FETCHING_YOTI_SESSION" },
		);
		expect(logger.error).toHaveBeenNthCalledWith(2,
			"Error occurred during documentSelection orchestration", "An error occurred when fetching Yoti Session", { "messageCode": "FAILED_DOCUMENT_SELECTION_ORCHESTRATION" },
		);
	});

	it("Throw server error if Yoti pdf generation fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);


		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce(undefined);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe( "An error occurred when generating Yoti instructions pdf");
		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(1,
			"An error occurred when generating Yoti instructions pdf", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS },
		);
		expect(logger.error).toHaveBeenNthCalledWith(2,
			"Error occurred during documentSelection orchestration", "An error occurred when generating Yoti instructions pdf", { "messageCode": "FAILED_DOCUMENT_SELECTION_ORCHESTRATION" },
		);

	});

	it("Return 200 when write to txMA fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockF2fService.sendToTXMA.mockRejectedValue({});

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_START to SQS queue.", { "messageCode": "ERROR_WRITING_TXMA" });
		
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});

	it("Throws server error if failure to send to GovNotify queue", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		mockF2fService.sendToGovNotify.mockRejectedValueOnce("Failed to send to GovNotify Queue");

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error occurred when sending message to GovNotify handler");
		expect(logger.error).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(1,
			"Yoti session created, failed to post message to GovNotify SQS Queue", { "error": "Failed to send to GovNotify Queue", "messageCode": "FAILED_TO_WRITE_GOV_NOTIFY" },
		);
		expect(logger.error).toHaveBeenNthCalledWith(2,
			"Error occurred during documentSelection orchestration", "An error occurred when sending message to GovNotify handler", { "messageCode": "FAILED_DOCUMENT_SELECTION_ORCHESTRATION" },
		);
	});

	it("Return 500 when updating the session returns an error", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		mockF2fService.updateSessionWithYotiIdAndStatus.mockRejectedValueOnce("Got error saving Yoti session details");


		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234", encodedHeader);

		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error has occurred");
	});

	it("Return 500 when updating the TTLs returns an error", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000));

		mockF2fService.updateSessionTtl.mockRejectedValueOnce("Got error updating SESSIONTABLE ttl");

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error has occurred");
	});

	it("Return 500 when add users documentUsed returns an error", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		
		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		mockF2fService.addUsersSelectedDocument.mockRejectedValueOnce("Got error updating SESSIONTABLE ttl");

		const out: APIGatewayProxyResult = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledTimes(1);
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error has occurred");
	});

	it("invokes step function if PRINTED_CUSTOMER_LETTER_ENABLED set to true", async () => {
		(getParameter as jest.Mock).mockResolvedValueOnce("true");

		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		mockF2fService.saveUserPdfPreferences.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "RandomF2FSessionID", encodedHeader);

		// @ts-ignore
		expect(mockDocumentSelectionRequestProcessor.stepFunctionsClient.send).toHaveBeenCalledWith(
			{ "input": "{\"sessionId\":\"RandomF2FSessionID\",\"pdfPreference\":\"PRINTED_LETTER\",\"yotiSessionID\":\"b83d54ce-1565-42ee-987a-97a1f48f27dg\",\"govuk_signin_journey_id\":\"sdfssg\"}", "name": "RandomF2FSessionID-1585695600000", "stateMachineArn": "MockSendYotiLetterStateMachine.Arn" },
		);
		expect(logger.info).toHaveBeenNthCalledWith(6, { message: "Starting Yoti letter state machine" });
		expect(metrics.addDimension).toHaveBeenNthCalledWith(1, "pdf_preference", "PRINTED_LETTER");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "DocSelect_yoti_session_created", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "DocSelect_comms_choice", MetricUnits.Count, 1);
	
		expect(metrics.addDimension).toHaveBeenNthCalledWith(2, "document_type", "ukPassport");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "DocSelect_document_selected", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(4, "DocSelect_doc_select_complete", MetricUnits.Count, 1);

	});
});
