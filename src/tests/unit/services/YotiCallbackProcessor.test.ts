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
import { TXMA_CORE_FIELDS, TXMA_DL_VC_ISSUED, TXMA_VC_ISSUED } from "../data/txmaEvent";
import { getBrpFields, getCompletedYotiSession, getDocumentFields, getDrivingPermitFields, getEeaIdCardFields, getEuDrivingPermitFields } from "../utils/YotiCallbackUtils";

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
		const coreFields = TXMA_CORE_FIELDS
		coreFields.timestamp = absoluteTimeNow()
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(coreFields);
		const vcIssued =  TXMA_VC_ISSUED;
		vcIssued.event_name = "F2F_CRI_VC_ISSUED"
		vcIssued.timestamp = absoluteTimeNow()
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(vcIssued);
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
		const ukDlcoreFields = TXMA_CORE_FIELDS
		ukDlcoreFields.timestamp = absoluteTimeNow()
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, ukDlcoreFields);
		const ukDlVcIssued =  TXMA_DL_VC_ISSUED;
		ukDlVcIssued.event_name = "F2F_CRI_VC_ISSUED"
		ukDlVcIssued.timestamp = absoluteTimeNow()
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, ukDlVcIssued);

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
		const euDlcoreFields = TXMA_CORE_FIELDS
		euDlcoreFields.timestamp = absoluteTimeNow()

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, euDlcoreFields);
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
		const eeaDlcoreFields = TXMA_CORE_FIELDS
		eeaDlcoreFields.timestamp = absoluteTimeNow()

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, eeaDlcoreFields);
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
		const brpCoreFields = TXMA_CORE_FIELDS
		brpCoreFields.timestamp = absoluteTimeNow()

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, brpCoreFields);
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
