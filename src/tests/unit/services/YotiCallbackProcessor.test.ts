import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { Response } from "../../../utils/Response";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiCallbackProcessor } from "../../../services/YotiCallbackProcessor";
import { YotiService } from "../../../services/YotiService";
import { YotiCompletedSession } from "../../../models/YotiPayloads";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MockKmsJwtAdapterForVc } from "../utils/MockJwtVerifierSigner";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { Constants } from "../../../utils/Constants";
import { MessageCodes } from "../../../models/enums/MessageCodes";

let mockYotiCallbackProcessor: YotiCallbackProcessor;
const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();

const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });

jest.mock("../../../utils/KmsJwtAdapter");
const passingKmsJwtAdapterFactory = (_signingKeys: string) => new MockKmsJwtAdapterForVc(true);

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
		subject: "testsub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_ACCESS_TOKEN_ISSUED,
	};
	return sessionInfo;
}

function getCompletedYotiSession(): YotiCompletedSession {
	const completedYotiSession: YotiCompletedSession = {
		"client_session_token_ttl": 2637158,
		"session_id": "f4340e05-03ec-48fe-bf6b-5946089bb4f3",
		"state": "COMPLETED",
		"resources": {
			"id_documents": [
				{
					"id": "355e9f80-6f2a-470c-a72e-e13c7417fb9a",
					"tasks": [
						{
							"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
							"id": "a9521ad3-8b17-4115-b75f-0f3de86a4e2f",
							"state": "DONE",
							"created": "2023-04-05T10:11:03Z",
							"last_updated": "2023-04-05T10:14:02Z",
							"generated_checks": [],
							"generated_media": [
								{
									"id": "6b9efa9d-4968-4f5d-8536-377008526b26",
									"type": "JSON",
								},
							],
						},
					],
					"source": {
						"type": "IBV",
					},
					"created_at": "2023-04-05T10:11:03Z",
					"last_updated": "2023-04-05T10:14:02Z",
					"document_type": "PASSPORT",
					"issuing_country": "GBR",
					"pages": [
						{
							"capture_method": "CAMERA",
							"media": {
								"id": "cbb1503e-0fd5-456c-a023-2cfda11697e1",
								"type": "IMAGE",
								"created": "2023-04-05T10:13:50Z",
								"last_updated": "2023-04-05T10:13:50Z",
							},
							"frames": [
								{
									"media": {
										"id": "5e7cee77-3718-4a99-a8b8-eb2f8969449a",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:52Z",
										"last_updated": "2023-04-05T10:13:52Z",
									},
								},
								{
									"media": {
										"id": "82f2b1db-9bef-4a0a-ad6c-622da80b0894",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:54Z",
										"last_updated": "2023-04-05T10:13:54Z",
									},
								},
								{
									"media": {
										"id": "df322a12-ce9b-4790-bf96-810b84982129",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:56Z",
										"last_updated": "2023-04-05T10:13:56Z",
									},
								},
							],
						},
					],
					"document_fields": {
						"media": {
							"id": "6b9efa9d-4968-4f5d-8536-377008526b26",
							"type": "JSON",
							"created": "2023-04-05T10:14:02Z",
							"last_updated": "2023-04-05T10:14:02Z",
						},
					},
					"document_id_photo": {
						"media": {
							"id": "2c4b59e8-fb68-4c7c-ac35-edac5cafa687",
							"type": "IMAGE",
							"created": "2023-04-05T10:14:02Z",
							"last_updated": "2023-04-05T10:14:02Z",
						},
					},
				},
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
				{
					"id": "3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38",
					"tasks": [],
					"source": {
						"type": "IBV",
					},
					"created_at": "2023-04-05T10:17:58Z",
					"last_updated": "2023-04-05T10:18:06Z",
					"image": {
						"media": {
							"id": "5b77cd1f-a15a-4748-ba5c-92913be6974d",
							"type": "IMAGE",
							"created": "2023-04-05T10:18:06Z",
							"last_updated": "2023-04-05T10:18:06Z",
						},
					},
				},
			],
			"applicant_profiles": [
				{
					"id": "88eb9e0b-acd8-4f49-940b-89740d649508",
					"tasks": [],
					"source": {
						"type": "RELYING_BUSINESS",
					},
					"created_at": "2023-04-05T08:13:56Z",
					"last_updated": "2023-04-05T08:13:56Z",
					"media": {
						"id": "119b8fb5-626d-43ad-9a09-450c1580d9e1",
						"type": "JSON",
						"created": "2023-04-05T08:13:56Z",
						"last_updated": "2023-04-05T08:13:56Z",
					},
				},
			],
		},
		"checks": [
			{
				"type": "ID_DOCUMENT_AUTHENTICITY",
				"id": "0a3f07a4-def6-4d62-bc99-9893459c1bfb",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [
						{
							"sub_check": "document_in_date",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "fraud_list_check",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "hologram",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "hologram_movement",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "mrz_validation",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "no_sign_of_forgery",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "no_sign_of_tampering",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "ocr_mrz_comparison",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "other_security_features",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "physical_document_captured",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "yoti_fraud_list_check",
							"result": "FAIL",
							"details": [
								{
									"name": "provider_org",
									"value": "Yoti Ltd",
								},
							],
						},
					],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:38Z",
			},
			{
				"type": "ID_DOCUMENT_FACE_MATCH",
				"id": "b8020135-612a-431b-a457-76d4a9959918",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
					"3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [
						{
							"sub_check": "ai_face_match",
							"result": "PASS",
							"details": [
								{
									"name": "confidence_score",
									"value": "0.99",
								},
							],
						},
						{
							"sub_check": "manual_face_match",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "yoti_fraud_list_check",
							"result": "FAIL",
							"details": [
								{
									"name": "provider_org",
									"value": "Yoti Ltd",
								},
							],
						},
					],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:37:19Z",
			},
			{
				"type": "IBV_VISUAL_REVIEW_CHECK",
				"id": "d3304228-a7f3-4b33-92aa-569209de8a0a",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
			},
			{
				"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
				"id": "f19eba50-0cf6-434a-8592-9f0d97141495",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
				"scheme": "UK_GDS",
			},
			{
				"type": "PROFILE_DOCUMENT_MATCH",
				"id": "424a95ff-7ef6-4db4-b721-cb94fb4aed70",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
					"88eb9e0b-acd8-4f49-940b-89740d649508",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
			},
		],
		"user_tracking_id": "some_id",
	};
	return completedYotiSession;
}

function getDocumentFields() {
	const documentFields = {
		"full_name": "ANGELA ZOE UK SPECIMEN",
		"date_of_birth": "1988-12-04",
		"nationality": "GBR",
		"given_names": "ANGELA ZOE",
		"family_name": "UK SPECIMEN",
		"place_of_birth": "CROYDON",
		"gender": "FEMALE",
		"document_type": "PASSPORT",
		"issuing_country": "GBR",
		"document_number": "533401372",
		"expiration_date": "2025-09-28",
		"date_of_issue": "2015-09-28",
		"issuing_authority": "HMPO",
		"mrz": {
			"type": 2,
			"line1": "P<GBRUK<SPECIMEN<<ANGELA<ZOE<<<<<<<<<<<<<<<<",
			"line2": "5334013720GBR8812049F2509286<<<<<<<<<<<<<<00",
		},
	};
	return documentFields;
}

function getDrivingPermitFields() {
	const documentFields = {
		"full_name": "LEEROY JENKINS",
		"date_of_birth": "1988-12-04",
		"given_names": "LEEROY",
		"family_name": "JENKINS",
		"place_of_birth": "UNITED KINGDOM",
		"gender": "MALE",
		"structured_postal_address": {
			"address_format": 1,
			"building_number": "122",
			"address_line1": "122 BURNS CRESCENT",
			"address_line2": "EDINBURGH",
			"address_line3": "EH1 9GP",
			"town_city": "STORMWIND",
			"postal_code": "EH1 9GP",
			"country_iso": "GBR",
			"country": "United Kingdom",
			"formatted_address": "122 BURNS CRESCENT\nStormwind\nEH1 9GP"
		},
		"document_type": "DRIVING_LICENCE",
		"issuing_country": "GBR",
		"document_number": "LJENK533401372",
		"expiration_date": "2025-09-28",
		"date_of_issue": "2015-09-28",
		"issuing_authority": "DVLA",
	};
	return documentFields;
}

function getEuDrivingPermitFields() {
	const documentFields = {
		"full_name": "Erika - Mustermann",
		"date_of_birth": "1988-12-04",
		"given_names": "Erika -",
		"family_name": "Mustermann",
		"place_of_birth": "Berlin",
		"document_type": "DRIVING_LICENCE",
		"issuing_country": "DEU",
		"document_number": "Z021AB37X13",
		"expiration_date": "2036-03-19",
		"date_of_issue": "2021-03-20",
		"place_of_issue": "Landratsamt Mu sterhausen amSee"
	};
	return documentFields;
}

function getEeaIdCardFields() {
	const documentFields = {
		"full_name": "Wiieke Liselotte De Bruijn",
		"date_of_birth": "1988-12-04",
		"given_names": "Wiieke Liselotte",
		"family_name": "De Bruijn",
		"document_type": "NATIONAL_ID",
		"issuing_country": "NLD",
		"document_number": "SPEC12031",
		"expiration_date": "2031-08-02",
		"date_of_issue": "2021-08-02",
	};
	return documentFields;
}

function getBrpFields() {
	const documentFields = {
		"full_name": "TECH REFRESH ICTHREEMALE",
		"date_of_birth": "1988-12-04",
		"nationality": "KEN",
		"given_names": "TECH REFRESH",
		"family_name": "ICTHREEMALE",
		"place_of_birth": "NAIROBI",
		"gender": "MALE",
		"document_type": "RESIDENCE_PERMIT",
		"issuing_country": "GBR",
		"document_number": "RF9082242",
		"expiration_date": "2024-11-11",
		"date_of_issue": "2015-05-19",
		"mrz": {
			"type": 1,
			"line1": "IRGBRRF90822427<<<<<<<<<<<<<<<",
			"line2": "9008010M1511114KEN<<<<<<<<<<<8",
			"line3": "ICTHREEMALE<<TECH<REFRESH<<<<<"
		},
		"place_of_issue": "UK"
	};
	return documentFields;
}

const VALID_REQUEST = {
	"session_id":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
	"topic" : "session_completion",
};

describe("YotiCallbackProcessor", () => {
	let f2fSessionItem: ISessionItem, completedYotiSession: YotiCompletedSession, documentFields: any;
	beforeAll(() => {
		mockYotiCallbackProcessor = new YotiCallbackProcessor(logger, metrics, "YOTIPRIM");
		// @ts-ignore
		mockYotiCallbackProcessor.f2fService = mockF2fService;
		// @ts-ignore
		mockYotiCallbackProcessor.yotiService = mockYotiService;

		completedYotiSession = getCompletedYotiSession();
		documentFields = getDocumentFields();
		f2fSessionItem = getMockSessionItem();

	});

	beforeEach(() => {
		jest.clearAllMocks();
		// @ts-ignore
		mockYotiCallbackProcessor.kmsJwtAdapter = passingKmsJwtAdapterFactory();
	});

	it("Return successful response with 200 OK when YOTI session created with UK Passport", async () => {
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_YOTI_RESPONSE_RECEIVED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined}});
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_CRI_VC_ISSUED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined},
		extensions: {
			evidence: [
				{
					"type": "IdentityCheck",
					"strengthScore": 3,
					"validityScore": 2,
					"verificationScore": 3,
					"checkDetails": [
						{
							"checkMethod": "vri",
							"identityCheckPolicy": "published",
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
						{
							"checkMethod": "pvr",
							"photoVerificationProcessLevel": 3,
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
				],
				"ci": undefined,
				}
			]
		}, 
			restricted: {
				user: {
					"name": "ANGELA ZOE UK SPECIMEN",
					"birthDate": "1988-12-04"
				},
				"passport": [{
					"documentType": "PASSPORT",
					"documentNumber": "533401372",
					"expiryDate": "2025-09-28",
					"icaoIssuerCode": "GBR"
				}]
			}
		});

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"vc":{
					"@context":[
					 Constants.W3_BASE_CONTEXT,
					 Constants.DI_CONTEXT,
					],
					"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
					 "credentialSubject":{
						"name":[
								 {
								"nameParts":[
											 {
										"value":"ANGELA",
										"type":"GivenName",
											 },
											 {
										"value":"ZOE",
										"type":"GivenName",
											 },
											 {
										"value":"UK SPECIMEN",
										"type":"FamilyName",
											 },
								],
								 },
						],
						"birthDate":[
								 {
								"value":"1988-12-04",
								 },
						],
						"passport":[
								 {
								"documentNumber":"533401372",
								"expiryDate":"2025-09-28",
								"icaoIssuerCode":"GBR",
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "photoVerificationProcessLevel":3,
								},
								 ],
						},
					 ],
				},
		 })],
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("OK");
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with driving permit", async () => {
		documentFields = getDrivingPermitFields();
		const ukDLYotiSession =  getCompletedYotiSession();
		ukDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE"
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(ukDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_YOTI_RESPONSE_RECEIVED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined}});
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_CRI_VC_ISSUED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined},
		extensions: {
			evidence: [
				{
					"type": "IdentityCheck",
					"strengthScore": 3,
					"validityScore": 2,
					"verificationScore": 3,
					"checkDetails": [
						{
							"checkMethod": "vri",
							"identityCheckPolicy": "published",
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
						{
							"checkMethod": "pvr",
							"photoVerificationProcessLevel": 3,
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
				],
				"ci": undefined,
				}
			]
		}, 
			restricted: {
				user: {
					"name": "LEEROY JENKINS",
					"birthDate": "1988-12-04"
				},
				"drivingPermit": [{
					"documentType": "DRIVING_LICENCE",
					"personalNumber": "LJENK533401372",
					"expiryDate": "2025-09-28",
					"issuingCountry": "GBR",
					"issuedBy": "DVLA",
					"issueDate": "2015-09-28",
					"fullAddress": "122 BURNS CRESCENT\nStormwind\nEH1 9GP"
				}]
			}
		});

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"vc":{
					"@context":[
					 Constants.W3_BASE_CONTEXT,
					 Constants.DI_CONTEXT,
					],
					"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
					 "credentialSubject":{
						"name":[
								 {
								"nameParts":[
											 {
										"value":"LEEROY",
										"type":"GivenName",
											 },
											 {
										"value":"JENKINS",
										"type":"FamilyName",
											 },
								],
								 },
						],
						"birthDate":[
								 {
								"value":"1988-12-04",
								 },
						],
						"address":[
							{
								"buildingNumber":"122",
								"streetName":"BURNS CRESCENT",
								"addressLocality":"STORMWIND",
								"postalCode":"EH1 9GP",
								"addressCountry":"United Kingdom"
							}
						],
						"drivingPermit":[
								 {
									"personalNumber": "LJENK533401372",
									"expiryDate": "2025-09-28",
										"issueDate": "2015-09-28",
									"issuedBy": "DVLA",
									
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "photoVerificationProcessLevel":3,
								},
								 ],
						},
					 ],
				},
		 })],
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("OK");
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with EU driving permit", async () => {
		documentFields = getEuDrivingPermitFields();
		const euDLYotiSession = getCompletedYotiSession();
		euDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE"
		euDLYotiSession.resources.id_documents[0].issuing_country = "DEU"
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(euDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_YOTI_RESPONSE_RECEIVED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined}});
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_CRI_VC_ISSUED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined},
		extensions: {
			evidence: [
				{
					"type": "IdentityCheck",
					"strengthScore": 3,
					"validityScore": 2,
					"verificationScore": 3,
					"checkDetails": [
						{
							"checkMethod": "vri",
							"identityCheckPolicy": "published",
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
						{
							"checkMethod": "pvr",
							"photoVerificationProcessLevel": 3,
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
				],
				"ci": undefined,
				}
			]
		}, 
			restricted: {
				user: {
					"name": "Erika - Mustermann",
					"birthDate": "1988-12-04"
				},
				"drivingPermit": [{
					"documentType": "DRIVING_LICENCE",
					"personalNumber": "Z021AB37X13",
					"expiryDate": "2036-03-19",
					"issuingCountry": "DEU",
					"issuedBy": "Landratsamt Mu sterhausen amSee",
					"issueDate": "2021-03-20",
				}]
			}
		});

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"vc":{
					"@context":[
					 Constants.W3_BASE_CONTEXT,
					 Constants.DI_CONTEXT,
					],
					"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
					 "credentialSubject":{
						"name":[
								 {
								"nameParts":[
											 {
										"value":"Erika",
										"type":"GivenName",
											 },
											 {
										"value":"-",
										"type":"GivenName",
											 },
											 {
										"value":"Mustermann",
										"type":"FamilyName",
											 },
								],
								 },
						],
						"birthDate":[
								 {
								"value":"1988-12-04",
								 },
						],
						"drivingPermit":[
								 {
									"personalNumber": "Z021AB37X13",
									"expiryDate": "2036-03-19",
									"issueDate": "2021-03-20",
									"issuedBy": "Landratsamt Mu sterhausen amSee",
									"issuingCountry": "DE"
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "photoVerificationProcessLevel":3,
								},
								 ],
						},
					 ],
				},
		 })],
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("OK");
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with EEA Identity Card", async () => {
		documentFields = getEeaIdCardFields();
		const eeaYotiSession = getCompletedYotiSession();
		eeaYotiSession.resources.id_documents[0].document_type = "NATIONAL_ID"
		eeaYotiSession.resources.id_documents[0].issuing_country = "NLD"
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(eeaYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_YOTI_RESPONSE_RECEIVED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined}});
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_CRI_VC_ISSUED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined},
		extensions: {
			evidence: [
				{
					"type": "IdentityCheck",
					"strengthScore": 3,
					"validityScore": 2,
					"verificationScore": 3,
					"checkDetails": [
						{
							"checkMethod": "vri",
							"identityCheckPolicy": "published",
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
						{
							"checkMethod": "pvr",
							"photoVerificationProcessLevel": 3,
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
				],
				"ci": undefined,
				}
			]
		}, 
			restricted: {
				user: {
					"name": "Wiieke Liselotte De Bruijn",
					"birthDate": "1988-12-04"
				},
				"idCard": [{
					"documentType": "NATIONAL_ID",
					"documentNumber": "SPEC12031",
					"expiryDate": "2031-08-02",
					"icaoIssuerCode": "NLD",
					"issueDate": "2021-08-02",
				}]
			}
		});

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"vc":{
					"@context":[
					 Constants.W3_BASE_CONTEXT,
					 Constants.DI_CONTEXT,
					],
					"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
					 "credentialSubject":{
						"name":[
								 {
								"nameParts":[
											 {
										"value":"Wiieke",
										"type":"GivenName",
											 },
											 {
										"value":"Liselotte",
										"type":"GivenName",
											 },
											 {
										"value":"De Bruijn",
										"type":"FamilyName",
											 },
								],
								 },
						],
						"birthDate":[
								 {
								"value":"1988-12-04",
								 },
						],
						"idCard":[
								 {
									"documentNumber": "SPEC12031",
									"expiryDate": "2031-08-02",
									"issueDate": "2021-08-02",
									"icaoIssuerCode": "NLD"
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "photoVerificationProcessLevel":3,
								},
								 ],
						},
					 ],
				},
		 })],
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("OK");
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with BRP", async () => {
		documentFields = getBrpFields();
		const brpYotiSession = getCompletedYotiSession();
		brpYotiSession.resources.id_documents[0].document_type = "RESIDENCE_PERMIT"
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(brpYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_YOTI_RESPONSE_RECEIVED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined}});
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {"client_id": "ipv-core-stub", "component_id": "https://XXX-c.env.account.gov.uk", "event_name": "F2F_CRI_VC_ISSUED", "timestamp": absoluteTimeNow(), "user": {"govuk_signin_journey_id": "sdfssg", "ip_address": "127.0.0.1", "persistent_session_id": "sdgsdg", "session_id": "RandomF2FSessionID", "transaction_id": undefined, "user_id": "testsub", "email": undefined},
		extensions: {
			evidence: [
				{
					"type": "IdentityCheck",
					"strengthScore": 3,
					"validityScore": 2,
					"verificationScore": 3,
					"checkDetails": [
						{
							"checkMethod": "vri",
							"identityCheckPolicy": "published",
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
						{
							"checkMethod": "pvr",
							"photoVerificationProcessLevel": 3,
							"txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
						},
				],
				"ci": undefined,
				}
			]
		}, 
			restricted: {
				user: {
					"name": "TECH REFRESH ICTHREEMALE",
					"birthDate": "1988-12-04"
				},
				"residencePermit": [{
					"documentType": "RESIDENCE_PERMIT",
					"documentNumber": "RF9082242",
					"expiryDate": "2024-11-11",
					"issueDate": "2015-05-19",
					"icaoIssuerCode": "GBR"
				}]
			}
		});

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"vc":{
					"@context":[
					 Constants.W3_BASE_CONTEXT,
					 Constants.DI_CONTEXT,
					],
					"type": [Constants.VERIFIABLE_CREDENTIAL, Constants.IDENTITY_CHECK_CREDENTIAL],
					 "credentialSubject":{
						"name":[
								 {
								"nameParts":[
											 {
										"value":"TECH",
										"type":"GivenName",
											 },
											 {
										"value":"REFRESH",
										"type":"GivenName",
											 },
											 {
										"value":"ICTHREEMALE",
										"type":"FamilyName",
											 },
								],
								 },
						],
						"birthDate":[
								 {
								"value":"1988-12-04",
								 },
						],
						"residencePermit":[
								 {
									"documentNumber": "RF9082242",
									"expiryDate": "2024-11-11",
									"issueDate": "2015-05-19",
									"icaoIssuerCode": "GBR"
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
											 "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
											 "photoVerificationProcessLevel":3,
								},
								 ],
						},
					 ],
				},
		 })],
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("OK");
		jest.useRealTimers();
		jest.clearAllMocks();
	});


	it("Throw server error if completed Yoti session can not be found", async () => {
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(undefined);

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Yoti Session not found",
		}));
	});

	it("Throw server error if F2F Session can not be found", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Missing Info in Session Table",
		}));
	});

	it("Return 200 when write to txMA fails", async () => {
		
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenNthCalledWith(1, "Failed to write TXMA event F2F_YOTI_RESPONSE_RECEIVED to SQS queue.", { messageCode: MessageCodes.FAILED_TO_WRITE_TXMA });
		expect(logger.error).toHaveBeenNthCalledWith(2, "Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.", { error: {}, messageCode: MessageCodes.FAILED_TO_WRITE_TXMA });
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});


	it("Throws server error if failure to send to IPVCore queue", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		mockF2fService.sendToIPVCore.mockRejectedValueOnce("Failed to send to IPV Core");

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to send to IPV Core",
		}));
	});

	it("Throws server error if session in Yoti is not completed", async () => {
		completedYotiSession.state = "ONGOING";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Yoti Session not complete",
		}));
	});
});
