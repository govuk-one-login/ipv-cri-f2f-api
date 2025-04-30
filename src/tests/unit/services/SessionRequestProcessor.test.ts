/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { SessionRequestProcessor } from "../../../services/SessionRequestProcessor";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { VALID_SESSION, SESSION_WITH_INVALID_CLIENT, VALID_SESSION_MISSING_XFORWARDEDFOR } from "../data/session-events";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";
import { JWTPayload } from "jose";
import { Jwt } from "../../../utils/IVeriCredential";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { ISessionItem } from "../../../models/ISessionItem";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";

/* eslint @typescript-eslint/unbound-method: 0 */
let sessionRequestProcessor: SessionRequestProcessor;
const mockF2fService = mock<F2fService>();
const mockKmsJwtAdapter = mock<KmsJwtAdapter>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();
const mockValidationHelper = mock<ValidationHelper>();
jest.mock("crypto", () => ({
	...jest.requireActual("crypto"),
	randomUUID: () => "session-id",
}));

const decodedJwtFactory = ():Jwt => {
	return {
		header: {
			alg: "mock",
		},
		payload: {
			govuk_signin_journey_id: "abcdef",
			shared_claims:{
				name:[
					{
					   nameParts:[
						  {
							 value:"John",
							 type:"GivenName",
						  },
						  {
							 value:"Joseph",
							 type:"GivenName",
						  },
						  {
							 value:"Testing",
							 type:"FamilyName",
						  },
					   ],
					},
				],
				birthDate:[
					{
					   "value":"1960-02-02",
					},
				],
				address: [
					{
						addressCountry: "GB",
						buildingName: "Sherman",
						subBuildingName: "Flat 5",
						uprn: 123456789,
						streetName: "Wallaby Way",
						postalCode: "F1 1SH",
						buildingNumber: "32",
						addressLocality: "Sidney",
					},
				],
				emailAddress:"test.user@digital.cabinet-office.gov.uk",
			},
		},
		signature: "signature",
	};
};

const decryptedJwtPayloadFactory = ():JWTPayload => {
	return {
		iss: "mock",
		sub: "mock",
		aud: "mock",
		jti: "mock",
		nbf: 1234,
		exp: 5678,
		iat: 1234,		
	};
};

const sessionItemFactory = ():ISessionItem => {
	return {
		attemptCount: 0,
		authSessionState: "",
		clientId: "",
		clientIpAddress: "",
		clientSessionId: "",
		createdDate: 0,
		expiryDate: 0,
		persistentSessionId: "",
		redirectUri: "",
		sessionId: "",
		state: "",
		subject: "",
	};
};

const F2F_SESSION_STARTED_TXMA_EVENT = {
	event_name: TxmaEventNames.F2F_CRI_START,
	component_id: "https://XXX-c.env.account.gov.uk",
	event_timestamp_ms: 1585695600000,
	timestamp: 1585695600000 / 1000,
	user: {
		govuk_signin_journey_id: "abcdef",
		ip_address: "82.41.23.127",
		user_id: "",
		persistent_session_id: undefined,
		session_id: "session-id",
	},
};

describe("SessionRequestProcessor", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	beforeAll(() => {
		sessionRequestProcessor = new SessionRequestProcessor(logger, metrics);
		// @ts-expect-error linting to be updated
		sessionRequestProcessor.f2fService = mockF2fService;
		// @ts-expect-error linting to be updated
		sessionRequestProcessor.kmsDecryptor = mockKmsJwtAdapter;
		// @ts-expect-error linting to be updated
		sessionRequestProcessor.validationHelper = mockValidationHelper;
	});

	it("should report unrecognised client", async () => {
		const response = await sessionRequestProcessor.processRequest(SESSION_WITH_INVALID_CLIENT);

		expect(response.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report a JWE decryption failure", async () => {
		mockKmsJwtAdapter.decrypt.mockRejectedValue("error");

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.FAILED_DECRYPTING_JWE,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report a failure to decode JWT", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockImplementation(() => {
			throw Error("Error");
		});

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.FAILED_DECODING_JWT,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report a JWT verification failure", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(null);

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.FAILED_VERIFYING_JWT,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report an unexpected error verifying JWT", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockRejectedValue({});

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.FAILED_VERIFYING_JWT,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report a JWT validation failure", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("errors");

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_VALIDATING_JWT",
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report invalid address countryCode failure", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"Invalid country code in the postalAddress", errorMessageCode: MessageCodes.INVALID_COUNTRY_CODE });

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.INVALID_COUNTRY_CODE,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report invalid address format failure", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session", errorMessageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS });

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should return unauthorized when emailAddress is missing in the sharedClaim data", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage:"Missing emailAddress from shared claims data", errorMessageCode: MessageCodes.MISSING_PERSON_EMAIL_ADDRESS });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.MISSING_PERSON_EMAIL_ADDRESS,
			}),
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should report session already exists", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(sessionItemFactory());

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.SESSION_ALREADY_EXISTS,
			}),
		);
		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should fail to create a session", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockRejectedValue("error");

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.FAILED_CREATING_SESSION,
			}),
		);
		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("should create a new session", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(expect.objectContaining(
			{
				event_name: TxmaEventNames.F2F_CRI_START,
			}), "ENCHEADER");

		expect(response.statusCode).toBe(HttpCodesEnum.OK);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "state-F2F_SESSION_CREATED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "session_created", MetricUnits.Count, 1)
	});

	it("ip_address is X_FORWARDED_FOR header if present in event header", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();

		await sessionRequestProcessor.processRequest(VALID_SESSION);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(F2F_SESSION_STARTED_TXMA_EVENT, "ENCHEADER");
	});

	it("ip_address is source_ip when X_FORWARDED_FOR header is not present", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();

		await sessionRequestProcessor.processRequest(VALID_SESSION_MISSING_XFORWARDEDFOR);

		const expectedTxmaEvent = F2F_SESSION_STARTED_TXMA_EVENT;
		expectedTxmaEvent.user.ip_address = "1.0.0.15";
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(expectedTxmaEvent, "ENCHEADER");
	});

	it("when headers is missing", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();

		const session_event = JSON.parse(JSON.stringify(VALID_SESSION_MISSING_XFORWARDEDFOR));
		delete session_event.headers;

		await sessionRequestProcessor.processRequest(session_event);

		const expectedTxmaEvent = F2F_SESSION_STARTED_TXMA_EVENT;
		expectedTxmaEvent.user.ip_address = "1.0.0.15";
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(expectedTxmaEvent, undefined);
	});

	it("should create a new session but report a TxMA failure", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();
		mockF2fService.sendToTXMA.mockRejectedValue("failed");

		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.OK);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_TO_WRITE_TXMA",
			}),
		);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "state-F2F_SESSION_CREATED", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "session_created", MetricUnits.Count, 1)
	});

	// the test below fails as the session processor is not writing the expiryDate value correctly in
	// seconds, it is writing it in ms. To be fixed in separate ticket
	it("the session created should have a valid expiryDate", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();
		mockF2fService.savePersonIdentity.mockRejectedValue("error");
		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.000Z

		await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(mockF2fService.createAuthSession).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				expiryDate: Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL_SECS!),
			}),
		);
		// the next assertion checks that the value has no more than 10 digits, i.e. is in secs not ms
		// this will break in the year 2286!
		const actualExpiryDate = mockF2fService.createAuthSession.mock.calls[0][0].expiryDate;
		expect(actualExpiryDate).toBeLessThan(10000000000);
		jest.useRealTimers();
	});
	
	it("the session created should have an empty subjectId", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());

		const jwtPayload = decryptedJwtPayloadFactory();
		jwtPayload.sub = undefined;

		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(jwtPayload);
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isPersonDetailsValid.mockReturnValue({ errorMessage : "", errorMessageCode : "" });
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();
		mockF2fService.savePersonIdentity.mockRejectedValue("error");
		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.000Z

		await sessionRequestProcessor.processRequest(VALID_SESSION);

		expect(mockF2fService.createAuthSession).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				expiryDate: Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL_SECS!),
				subject: ""
			}),
		);
		// the next assertion checks that the value has no more than 10 digits, i.e. is in secs not ms
		// this will break in the year 2286!
		const actualExpiryDate = mockF2fService.createAuthSession.mock.calls[0][0].expiryDate;
		expect(actualExpiryDate).toBeLessThan(10000000000);
		jest.useRealTimers();
	});	
});
