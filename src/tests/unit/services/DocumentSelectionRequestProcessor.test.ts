import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { Response } from "../../../utils/Response";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { DocumentSelectionRequestProcessor } from "../../../services/DocumentSelectionRequestProcessor";
import { VALID_REQUEST } from "../data/documentSelection-events";
import { YotiService } from "../../../services/YotiService";
import { PersonIdentity } from "../../../models/PersonIdentity";
import { YotiSessionInfo } from "../../../models/YotiPayloads";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";

let mockDocumentSelectionRequestProcessor: DocumentSelectionRequestProcessor;
const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();

const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });

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
		authSessionState: AuthSessionState.F2F_DATA_RECEIVED,
	};
	return sessionInfo;
}

function getPersonIdentityItem(): PersonIdentity {
	const personIdentityItem: PersonIdentity = {
		"sessionId":"RandomF2FSessionID",
		"names":[
			 {
				"nameParts":[
						 {
						"type":"GivenName",
						"value":"Frederick",
						 },
						 {
						"type":"GivenName",
						"value":"Joseph",
						 },
						 {
						"type":"FamilyName",
						"value":"Flintstone",
						 },
				],
			 },
		],
		"birthDates":[
			 {
				"value":"1960-02-02",
			 },
		],
	};
	return personIdentityItem;
}

function getYotiSessionInfo(): YotiSessionInfo {
	const yotiSessionInfo: YotiSessionInfo = {
		"session_id":"RandomYotiSessionID",
		"client_session_token_ttl":604800,
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
							"scheme":"UK_DBS",
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

describe("DocumentSelectionRequestProcessor", () => {
	let personIdentityItem: PersonIdentity, f2fSessionItem: ISessionItem, yotiSessionInfo: YotiSessionInfo;
	beforeAll(() => {
		mockDocumentSelectionRequestProcessor = new DocumentSelectionRequestProcessor(logger, metrics, "YOTIPRIM");
		// @ts-ignore
		mockDocumentSelectionRequestProcessor.f2fService = mockF2fService;
		// @ts-ignore
		mockDocumentSelectionRequestProcessor.yotiService = mockYotiService;

		personIdentityItem = getPersonIdentityItem();
		yotiSessionInfo = getYotiSessionInfo();
		f2fSessionItem = getMockSessionItem();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return successful response with 200 OK when YOTI session created", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: Response = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234");

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});

	it("Throw bad request error when personDetails is missing", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(undefined);

		return expect(mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION or PERSON IDENTITY tables",
		}));
	});

	it("Throw server error if Yoti Session creation fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce(undefined);

		const out: Response = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234");

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error occured when creating Yoti Session");
	});

	it("Throw server error if Yoti Session info fetch fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(undefined);

		const out: Response = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234");

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe( "An error occurred when fetching Yoti Session");
	});

	it("Throw server error if Yoti pdf generation fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce(undefined);

		const out: Response = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234");

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe( "An error occured when generating Yoti instructions pdf");
	});

	it("Return 200 when write to txMA fails", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		mockYotiService.createSession.mockResolvedValueOnce("b83d54ce-1565-42ee-987a-97a1f48f27dg");

		mockYotiService.fetchSessionInfo.mockResolvedValueOnce(yotiSessionInfo);

		mockYotiService.generateInstructions.mockResolvedValueOnce(HttpCodesEnum.OK);

		const out: Response = await mockDocumentSelectionRequestProcessor.processRequest(VALID_REQUEST, "1234");

		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_START to SQS queue.");
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Instructions PDF Generated");
	});
});
