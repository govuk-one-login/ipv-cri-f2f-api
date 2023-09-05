/* eslint-disable @typescript-eslint/unbound-method */
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
import { VerifiableCredentialService } from "../../../services/VerifiableCredentialService";
import { AppError } from "../../../utils/AppError";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { TXMA_BRP_VC_ISSUED, TXMA_CORE_FIELDS, TXMA_DL_VC_ISSUED, TXMA_EEA_VC_ISSUED, TXMA_EU_DL_VC_ISSUED, TXMA_VC_ISSUED } from "../data/txmaEvent";
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

describe("YotiCallbackProcessor", () => {
	let f2fSessionItem: ISessionItem, personIdentityItem: PersonIdentityItem, completedYotiSession: YotiCompletedSession, documentFields: any;
	beforeAll(() => {
		mockYotiCallbackProcessor = new YotiCallbackProcessor(logger, metrics, "YOTIPRIM");
		// @ts-ignore
		mockYotiCallbackProcessor.f2fService = mockF2fService;
		// @ts-ignore
		mockYotiCallbackProcessor.yotiService = mockYotiService;

		completedYotiSession = getCompletedYotiSession();
		documentFields = getDocumentFields();
		f2fSessionItem = getMockSessionItem();
		personIdentityItem = getPersonIdentityItem();

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
		const coreFields = TXMA_CORE_FIELDS;
		coreFields.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(coreFields);
		const vcIssued =  TXMA_VC_ISSUED;
		vcIssued.event_name = "F2F_CRI_VC_ISSUED";
		vcIssued.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, vcIssued);
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
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with driving permit", async () => {
		documentFields = getDrivingPermitFields();
		const ukDLYotiSession =  getCompletedYotiSession();
		ukDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
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
		const ukDlcoreFields = TXMA_CORE_FIELDS;
		ukDlcoreFields.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, ukDlcoreFields);
		const ukDlVcIssued =  TXMA_DL_VC_ISSUED;
		ukDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		ukDlVcIssued.timestamp = absoluteTimeNow();
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
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with EU driving permit", async () => {
		documentFields = getEuDrivingPermitFields();
		const euDLYotiSession = getCompletedYotiSession();
		euDLYotiSession.resources.id_documents[0].document_type = "DRIVING_LICENCE";
		euDLYotiSession.resources.id_documents[0].issuing_country = "DEU";
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(euDLYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);
		const euDlcoreFields = TXMA_CORE_FIELDS;
		euDlcoreFields.timestamp = absoluteTimeNow();

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, euDlcoreFields);
		const euDlVcIssued =  TXMA_EU_DL_VC_ISSUED;
		euDlVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		euDlVcIssued.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, euDlVcIssued);

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
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with EEA Identity Card", async () => {
		documentFields = getEeaIdCardFields();
		const eeaYotiSession = getCompletedYotiSession();
		eeaYotiSession.resources.id_documents[0].document_type = "NATIONAL_ID";
		eeaYotiSession.resources.id_documents[0].issuing_country = "NLD";
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(eeaYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);
		const eeaDlcoreFields = TXMA_CORE_FIELDS;
		eeaDlcoreFields.timestamp = absoluteTimeNow();
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, eeaDlcoreFields);
		const eeaVcIssued =  TXMA_EEA_VC_ISSUED;
		eeaVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		eeaVcIssued.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, eeaVcIssued);

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
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when YOTI session created with BRP", async () => {
		documentFields = getBrpFields();
		const brpYotiSession = getCompletedYotiSession();
		brpYotiSession.resources.id_documents[0].document_type = "RESIDENCE_PERMIT";
		jest.useFakeTimers();
		jest.setSystemTime(absoluteTimeNow());
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(brpYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		// @ts-ignore
		mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		const out: Response = await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);
		const brpCoreFields = TXMA_CORE_FIELDS;
		brpCoreFields.timestamp = absoluteTimeNow();

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, brpCoreFields);
		const brpVcIssued =  TXMA_BRP_VC_ISSUED;
		brpVcIssued.event_name = "F2F_CRI_VC_ISSUED";
		brpVcIssued.timestamp = absoluteTimeNow();
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, brpVcIssued);

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
								"icaoIssuerCode": "GBR",
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
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	describe("name checks", () => {
		it("Should call getNamesFromYoti if DocumentFields contains both given_name and family_name fields", async () => {
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

			// @ts-ignore
			mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);
			expect(logger.info).toHaveBeenCalledWith("Getting NameParts using Yoti DocumentFields Info");
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

			// @ts-ignore
			mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

		
			await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);
			expect(logger.info).toHaveBeenCalledWith("Getting NameParts using F2F Person Identity Info");
		});	

		it("Should use name casing from documentFields when using getNamesFromPersonIdentity", async () => {
			jest.useFakeTimers();
			jest.setSystemTime(absoluteTimeNow());
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
			mockYotiService.getMediaContent.mockResolvedValueOnce({ 
				...documentFields,
				given_names: undefined,
				full_name: "FrEdErIcK Joseph Flintstone",
			});
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(personIdentityItem);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

			// @ts-ignore
			mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			await mockYotiCallbackProcessor.processRequest(VALID_REQUEST);

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
									"documentNumber":"RF9082242",
									"expiryDate":"2024-11-11",
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
			jest.useRealTimers();
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

			// @ts-ignore
			mockYotiCallbackProcessor.verifiableCredentialService.kmsJwtAdapter = passingKmsJwtAdapterFactory();

			return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "FullName mismatch between F2F & YOTI",
			}));
		});
	});

	describe("yoti session info", () => {
		it("Throw server error if completed Yoti session can not be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(undefined);

			return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not found",
			}));
		});

		it("Throws server error if session in Yoti is not completed", async () => {
			const completedYotiSessionClone = { ...completedYotiSession, state: "ONGOING" };
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not complete",
			}));
		});

		it("Throws server error if session in Yoti does not contain document fields", () => {
			const completedYotiSessionClone = JSON.parse(JSON.stringify(completedYotiSession));
			delete completedYotiSessionClone.resources.id_documents[0].document_fields;
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti document_fields not populated",
			}));
		});

		it("Throws server error if session in Yoti does not contain media ID", () => {
			const completedYotiSessionClone = JSON.parse(JSON.stringify(completedYotiSession));
			delete completedYotiSessionClone.resources.id_documents[0].document_fields.media.id;
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSessionClone);
			mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);
	
			return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti document_fields media ID not found",
			}));
		});
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

	it("Throws server error if signGeneratedVerifiableCredentialJwt returns empty string", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		jest.spyOn(VerifiableCredentialService.prototype as any, "signGeneratedVerifiableCredentialJwt").mockReturnValue("");

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Unable to create signed JWT",
		}));
	});

	it("Returns server error response if signGeneratedVerifiableCredentialJwt throws error", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		jest.spyOn(VerifiableCredentialService.prototype as any, "signGeneratedVerifiableCredentialJwt").mockRejectedValueOnce(new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt"));

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).resolves.toEqual(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			body: "Failed to sign the verifiableCredential Jwt",
		}));
	});

	it("Throws server error if generateVerifiableCredentialJwt returns empty string", async () => {
		mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(completedYotiSession);
		mockYotiService.getMediaContent.mockResolvedValueOnce(documentFields);
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(f2fSessionItem);

		jest.spyOn(VerifiableCredentialService.prototype as any, "generateVerifiableCredentialJwt").mockReturnValue("");

		return expect(mockYotiCallbackProcessor.processRequest(VALID_REQUEST)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Unable to create signed JWT",
		}));
	});
});
