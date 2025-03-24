/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable @typescript-eslint/unbound-method */
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiSessionCompletionProcessor } from "../../../services/YotiSessionCompletionProcessor";
import { YotiService } from "../../../services/YotiService";
import { YotiCompletedSession } from "../../../models/YotiPayloads";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MockKmsJwtAdapterForVc } from "../utils/MockJwtVerifierSigner";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { Constants } from "../../../utils/Constants";
import { VerifiableCredentialService } from "../../../services/VerifiableCredentialService";
import { AppError } from "../../../utils/AppError";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { TXMA_CORE_FIELDS, TXMA_DL_VC_ISSUED, TXMA_DL_VC_ISSUED_WITHOUT_FULL_ADDRESS, TXMA_EEA_VC_ISSUED, TXMA_EU_DL_VC_ISSUED, TXMA_VC_ISSUED } from "../data/txmaEvent";
import { getCompletedYotiSession, getDocumentFields, getDrivingPermitFields, getDrivingPermitFieldsWithoutFormattedAddress, getEeaIdCardFields, getEuDrivingPermitFields } from "../utils/YotiCallbackUtils";
import { APIGatewayProxyResult } from "aws-lambda";

let mockCompletedSessionProcessor: YotiSessionCompletionProcessor;
const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();

const logger = mock<Logger>();
const metrics = mock<Metrics>();
jest.mock("crypto", () => ({
	...jest.requireActual("crypto"),
	randomUUID: () => "sdfsdf",
}));

jest.mock("../../../utils/KmsJwtAdapter");
const passingKmsJwtAdapterFactory = () => new MockKmsJwtAdapterForVc(true);

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

function getPersonIdentityItem(): PersonIdentityItem {
	const personIdentityItem: PersonIdentityItem = {
		"addresses": [
			{
				"addressCountry": "United Kingdom",
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
		expiryDate: 1612345678,
		createdDate: 1612335678,
	};
	return personIdentityItem;
}

const VALID_REQUEST = {
	"session_id":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
	"topic" : "session_completion",
};

describe("YotiSessionCompletionProcessor", () => {
	let f2fSessionItem: ISessionItem, personIdentityItem: PersonIdentityItem, completedYotiSession: YotiCompletedSession, documentFields: any;
	beforeAll(() => {
		mockCompletedSessionProcessor = new YotiSessionCompletionProcessor(logger, metrics, "YOTIPRIM");
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.f2fService = mockF2fService;

		YotiService.getInstance = jest.fn(() => mockYotiService);

		completedYotiSession = getCompletedYotiSession();
		documentFields = getDocumentFields();
		f2fSessionItem = getMockSessionItem();
		personIdentityItem = getPersonIdentityItem();

	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000));
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.kmsJwtAdapter = passingKmsJwtAdapterFactory();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with UK Passport", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		const coreFields = TXMA_CORE_FIELDS;
		coreFields.timestamp = 1585695600;
		coreFields.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(coreFields);
		const vcIssued =  TXMA_VC_ISSUED;
		vcIssued.event_name = "F2F_CRI_VC_ISSUED";
		vcIssued.timestamp = 1585695600;
		vcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, vcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
							     "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);

	});

	it("Return successful response with 200 OK when YOTI session created with driving permit", async () => {
		documentFields = getDrivingPermitFields();
		const ukDLYotiSession =  getCompletedYotiSession();
		ukDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(ukDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		const ukDlcoreFields = TXMA_CORE_FIELDS;
		ukDlcoreFields.timestamp = 1585695600;
		ukDlcoreFields.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, ukDlcoreFields);
		const ukDlVcIssued =  TXMA_DL_VC_ISSUED;
		ukDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		ukDlVcIssued.timestamp = 1585695600;
		ukDlVcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, ukDlVcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
								"addressCountry":"United Kingdom",
							},
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
							      "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	it("Return successful response with 200 OK when YOTI session is completed for driving permit- Media not containing formatted_address", async () => {
		documentFields = getDrivingPermitFieldsWithoutFormattedAddress();
		const ukDLYotiSession =  getCompletedYotiSession();
		ukDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(ukDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		const ukDlcoreFields = TXMA_CORE_FIELDS;
		ukDlcoreFields.timestamp = 1585695600;
		ukDlcoreFields.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, ukDlcoreFields);
		const ukDlVcIssued =  TXMA_DL_VC_ISSUED_WITHOUT_FULL_ADDRESS;
		ukDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		ukDlVcIssued.timestamp = 1585695600;
		ukDlVcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, ukDlVcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
								"addressCountry":"United Kingdom",
							},
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
							      "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	it("Return successful response with 200 OK when YOTI session is completed for driving permit- Media not containing structured_postal_address", async () => {
		documentFields = getDrivingPermitFieldsWithoutFormattedAddress();
		delete documentFields.structured_postal_address;
		const ukDLYotiSession =  getCompletedYotiSession();
		ukDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(ukDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		const ukDlcoreFields = TXMA_CORE_FIELDS;
		ukDlcoreFields.timestamp = 1585695600;
		ukDlcoreFields.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, ukDlcoreFields);
		const ukDlVcIssued =  TXMA_DL_VC_ISSUED_WITHOUT_FULL_ADDRESS;
		ukDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		ukDlVcIssued.timestamp = 1585695600;
		ukDlVcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, ukDlVcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
							      "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	it("Return successful response with 200 OK when YOTI session created with EU driving permit", async () => {
		documentFields = getEuDrivingPermitFields();
		const euDLYotiSession = getCompletedYotiSession();
		euDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
		euDLYotiSession.resources.id_documents[0].issuing_country = "DEU";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(euDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);
		const euDlcoreFields = TXMA_CORE_FIELDS;
		euDlcoreFields.timestamp = 1585695600;
		euDlcoreFields.event_timestamp_ms = 1585695600000;

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, euDlcoreFields);
		const euDlVcIssued =  TXMA_EU_DL_VC_ISSUED;
		euDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		euDlVcIssued.timestamp = 1585695600;
		euDlVcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, euDlVcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
								"issuingCountry": "DE",
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
							     "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	it("Return successful response with 200 OK when YOTI session created with EEA Identity Card", async () => {
		documentFields = getEeaIdCardFields();
		const eeaYotiSession = getCompletedYotiSession();
		eeaYotiSession.resources.id_documents[0].document_type = "NATIONAL_ID";
		eeaYotiSession.resources.id_documents[0].issuing_country = "NLD";
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(eeaYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);
		const eeaDlcoreFields = TXMA_CORE_FIELDS;
		eeaDlcoreFields.timestamp = 1585695600;
		eeaDlcoreFields.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, eeaDlcoreFields);
		const eeaVcIssued =  TXMA_EEA_VC_ISSUED;
		eeaVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		eeaVcIssued.timestamp = 1585695600;
		eeaVcIssued.event_timestamp_ms = 1585695600000;
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, eeaVcIssued);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
				"sub":"testsub",
				"nbf":absoluteTimeNow(),
				"iss":"https://XXX-c.env.account.gov.uk",
				"iat":absoluteTimeNow(),
				"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
								"icaoIssuerCode": "NLD",
								 },
						],
					 },
					 "evidence":[
						{
								 "type":"IdentityCheck",
							     "txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
								{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
								},
								{
											 "checkMethod":"pvr",
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	describe("name checks", () => {
		it("Should call getNamesFromYoti if DocumentFields contains both given_name and family_name fields", async () => {
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			// @ts-expect-error linting to be updated
			mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);
			expect(logger.info).toHaveBeenCalledWith("Getting NameParts using Yoti DocumentFields Info");
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);	
			expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
		});	

		it("Should call getNamesFromPersonIdentity if DocumentFields does not contain given_name", async () => {
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce({ 
				...documentFields,
				given_names: undefined,
				full_name: "FrEdErIcK Joseph Flintstone",
			});
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			// @ts-expect-error linting to be updated
			mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

			expect(logger.info).toHaveBeenCalledWith("Getting NameParts using F2F Person Identity Info");
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);	
		});	

		it("Should use name casing from documentFields when using getNamesFromPersonIdentity", async () => {
			documentFields = getDocumentFields();
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce({ 
				...documentFields,
				given_names: undefined,
				full_name: "FrEdErIcK Joseph Flintstone",
			});
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			// @ts-expect-error linting to be updated
			mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				"https://vocab.account.gov.uk/v1/credentialJWT": [JSON.stringify({
					"sub":"testsub",
					"nbf":absoluteTimeNow(),
					"iss":"https://XXX-c.env.account.gov.uk",
					"iat":absoluteTimeNow(),
					"jti":Constants.URN_UUID_PREFIX + "sdfsdf",
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
											"value":"FrEdErIcK",
											"type":"GivenName",
											 },
											 {
											"value":"Joseph",
											"type":"GivenName",
											 },
											 {
											"value":"Flintstone",
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
								"txn":"b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
								 "strengthScore":3,
								 "validityScore":2,
								 "verificationScore":3,
								 "checkDetails":[
									{
											 "checkMethod":"vri",
											 "identityCheckPolicy":"published",
									},
									{
											 "checkMethod":"pvr",
											 "photoVerificationProcessLevel":3,
									},
								 ],
							},
					 ],
					},
		 })],
			});
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
		});

		it("Should throw an error of name mismatch between F2F and Yoti DocumentFields", async () => {
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce({ 
				...documentFields,
				given_names: undefined,
				full_name: "Joseph FrEdErIcK Flintstone",
			});
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			// @ts-expect-error linting to be updated
			mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "FullName mismatch between F2F & YOTI",
			}));
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});
	});

	describe("yoti session info", () => {
		it("Throw server error if completed Yoti session can not be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(undefined);

			await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not found",
			}));
			expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Yoti Session not found", {
				messageCode: MessageCodes.ERROR_GENERATING_VC,
			});
			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				error: "access_denied",
    			error_description: "VC generation failed : Yoti Session not found",
			});
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});

		it("Throws server error if session in Yoti is not completed", async () => {
			const completedYotiSessionClone = { ...completedYotiSession, state: "ONGOING" };
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not complete",
			}));
			expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Yoti Session not complete", {
				messageCode: MessageCodes.ERROR_GENERATING_VC,
			});
			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				error: "access_denied",
    			error_description: "VC generation failed : Yoti Session not complete",
			});
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});

		it("Throws server error if session in Yoti does not contain document fields", async () => {
			const completedYotiSessionClone = JSON.parse(JSON.stringify(completedYotiSession));
			delete completedYotiSessionClone.resources.id_documents[0].document_fields;
			completedYotiSessionClone.checks = [
				{
					type: "ID_DOCUMENT_TEXT_DATA_CHECK",
					report: {
						recommendation: {
							value: "NOT_AVAILABLE",
							reason: "EXTRACTION_FAILED",
						},
						breakdown: [],
					},
				},
				{
					type: "ID_DOCUMENT_AUTHENTICITY",
					state: "DONE",
					generated_media: [],
					report: {
						recommendation: {
							value: "APPROVE",
						},
						breakdown: [
							{
								sub_check: "no_sign_of_forgery",
								result: "PASS",
								details: [],
								process: "AUTOMATED",
							},
							{
								sub_check: "no_sign_of_tampering",
								result: "PASS",
								details: [],
								process: "AUTOMATED",
							},
							{
								sub_check: "other_security_features",
								result: "PASS",
								details: [],
								process: "AUTOMATED",
							},
							{
								sub_check: "physical_document_captured",
								result: "PASS",
								details: [],
								process: "AUTOMATED",
							},
						],
					},
				},
			];
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti document_fields not populated",
			}));
			expect(logger.error).toHaveBeenCalledWith({ message: "No document_fields found in completed Yoti Session" }, {
				messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
				ID_DOCUMENT_TEXT_DATA_CHECK: {
					value: "NOT_AVAILABLE",
					reason: "EXTRACTION_FAILED",
				},
			});
			expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Yoti document_fields not populated", {
				messageCode: MessageCodes.ERROR_GENERATING_VC,
			});
			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				error: "access_denied",
    			error_description: "VC generation failed : Yoti document_fields not populated",
			});
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});

		it("Throws server error if session in Yoti contains multiple document_field entries", async () => {
			const completedYotiSessionClone = JSON.parse(JSON.stringify(completedYotiSession));
			completedYotiSessionClone.resources.id_documents = [completedYotiSession.resources.id_documents[0], completedYotiSession.resources.id_documents[0]];
		
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Multiple document_fields in response",
			}));
			expect(logger.error).toHaveBeenCalledWith({ message: "Multiple document_fields found in completed Yoti Session" }, {
				messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
			});
			expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Multiple document_fields in response", {
				messageCode: MessageCodes.ERROR_GENERATING_VC,
			});
			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				error: "access_denied",
    			error_description: "VC generation failed : Multiple document_fields in response",
			});
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});

		it("Throws server error if session in Yoti does not contain media ID", async () => {
			const completedYotiSessionClone = JSON.parse(JSON.stringify(completedYotiSession));
			delete completedYotiSessionClone.resources.id_documents[0].document_fields.media.id;
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti document_fields media ID not found",
			}));
			expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Yoti document_fields media ID not found", {
				messageCode: MessageCodes.ERROR_GENERATING_VC,
			});
			expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
				sub: "testsub",
				state: "Y@atr",
				error: "access_denied",
    			error_description: "VC generation failed : Yoti document_fields media ID not found",
			});
			expect(metrics.addMetric).not.toHaveBeenCalled()
		});
	});

	it("Throw server error if F2F Session can not be found", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

		await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Missing Info in Session Table",
		}));
		expect(metrics.addMetric).not.toHaveBeenCalled()
	});

	it("Should throw an error when session is in wrong AuthSessionState", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
		const f2fModifiedAuthSessionItem = getMockSessionItem();
		f2fModifiedAuthSessionItem.authSessionState = "F2F_YOTI_SESSION_CREATED";
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fModifiedAuthSessionItem);

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);
		expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : AuthSession is in wrong Auth state", {
			messageCode: MessageCodes.ERROR_GENERATING_VC,
		});
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			error: "access_denied",
			error_description: "VC generation failed : AuthSession is in wrong Auth state",
		});
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(out.body).toBe("AuthSession is in wrong Auth state: Expected state- F2F_ACCESS_TOKEN_ISSUED or F2F_AUTH_CODE_ISSUED, actual state- F2F_YOTI_SESSION_CREATED");
		expect(metrics.addMetric).not.toHaveBeenCalled()		
	});

	it("Return 200 when write to txMA fails", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: APIGatewayProxyResult = await mockCompletedSessionProcessor.processRequest(VALID_REQUEST);

		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenNthCalledWith(1, "Failed to write TXMA event F2F_YOTI_RESPONSE_RECEIVED to SQS queue.", { messageCode: MessageCodes.FAILED_TO_WRITE_TXMA });
		expect(logger.error).toHaveBeenNthCalledWith(2, "Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.", { error: {}, messageCode: MessageCodes.FAILED_TO_WRITE_TXMA });
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});


	it("Throws server error if failure to send to IPVCore queue", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-expect-error linting to be updated
		mockCompletedSessionProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		mockF2fService.sendToIPVCore.mockRejectedValueOnce("Failed to send to IPV Core");

		expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Failed to send to IPV Core",
		}));
		expect(metrics.addMetric).not.toHaveBeenCalled()		
	});

	it("Throws server error if signGeneratedVerifiableCredentialJwt returns empty string", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		jest.spyOn(VerifiableCredentialService.prototype as any, "signGeneratedVerifiableCredentialJwt").mockReturnValue("");

		await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Unable to create signed JWT",
		}));
		expect(logger.error).toHaveBeenNthCalledWith(2, "VC generation failed : Unable to create signed JWT", {
			messageCode: MessageCodes.ERROR_GENERATING_VC,
		});
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			error: "access_denied",
			error_description: "VC generation failed : Unable to create signed JWT",
		});
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).not.toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).not.toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	});

	it("Returns server error response if signGeneratedVerifiableCredentialJwt throws error", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		jest.spyOn(VerifiableCredentialService.prototype as any, "signGeneratedVerifiableCredentialJwt").mockRejectedValueOnce(new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt"));

		await expect(mockCompletedSessionProcessor.processRequest(VALID_REQUEST)).resolves.toEqual(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			body: "Failed to sign the verifiableCredential Jwt",
		}));
		expect(logger.error).toHaveBeenNthCalledWith(3, "VC generation failed : Failed to sign the verifiableCredential Jwt", {
			messageCode: MessageCodes.ERROR_GENERATING_VC,
		});
		expect(mockF2fService.sendToIPVCore).toHaveBeenCalledWith({
			sub: "testsub",
			state: "Y@atr",
			error: "access_denied",
			error_description: "VC generation failed : Failed to sign the verifiableCredential Jwt",
		});
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);
		expect(metrics.addMetric).not.toHaveBeenNthCalledWith(2, "state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
		expect(metrics.addMetric).not.toHaveBeenNthCalledWith(3, "SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
	
	});
	
	describe("isTaskDone function", () => {
		it('should return true if a task with the specified type and state "DONE" exists', () => {
			const data = {
				tasks: [
					{ type: "TASK1", state: "IN_PROGRESS" },
					{ type: "TASK2", state: "DONE" },
					{ type: "TASK3", state: "PENDING" },
				],
			};
	
			const taskTypeToCheck = "TASK2";
			const result = mockCompletedSessionProcessor.isTaskDone(data, taskTypeToCheck);
	
			expect(result).toBe(true);
		});
	
		it('should return false if no task with the specified type and state "DONE" exists', () => {
			const data = {
				tasks: [
					{ type: "TASK1", state: "IN_PROGRESS" },
					{ type: "TASK2", state: "PENDING" },
					{ type: "TASK3", state: "PENDING" },
				],
			};
	
			const taskTypeToCheck = "TASK2";
			const result = mockCompletedSessionProcessor.isTaskDone(data, taskTypeToCheck);
	
			expect(result).toBe(false);
		});
	
		it("should return false if tasks array is empty", () => {
			const data = {
				tasks: [],
			};
	
			const taskTypeToCheck = "TASK2";
			const result = mockCompletedSessionProcessor.isTaskDone(data, taskTypeToCheck);
	
			expect(result).toBe(false);
		});
	
		it("should return false if tasks property is missing", () => {
			const data = {
				// No "tasks" property
			};
	
			const taskTypeToCheck = "TASK2";
			const result = mockCompletedSessionProcessor.isTaskDone(data, taskTypeToCheck);
	
			expect(result).toBe(false);
		});
	});
});
