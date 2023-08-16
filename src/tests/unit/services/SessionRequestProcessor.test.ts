import { SessionRequestProcessor } from "../../../services/SessionRequestProcessor";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { VALID_SESSION, SESSION_WITH_INVALID_CLIENT } from "../data/session-events";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";
import { JWTPayload } from "jose";
import { Jwt } from "../../../utils/IVeriCredential";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { ISessionItem } from "../../../models/ISessionItem";
import { MessageCodes } from "../../../models/enums/MessageCodes";

/* eslint @typescript-eslint/unbound-method: 0 */
/* eslint jest/unbound-method: error */

let sessionRequestProcessor: SessionRequestProcessor;
const mockF2fService = mock<F2fService>();
const mockKmsJwtAdapter = mock<KmsJwtAdapter>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();
const mockValidationHelper = mock<ValidationHelper>();

const decodedJwtFactory = ():Jwt => {
	return {
		header: {
			alg: "mock",
		},
		payload: {
			govuk_signin_journey_id: "abcdef",
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

describe("SessionRequestProcessor", () => {
	beforeAll(() => {
		sessionRequestProcessor = new SessionRequestProcessor(logger, metrics);
		// @ts-ignore
		sessionRequestProcessor.f2fService = mockF2fService;
		// @ts-ignore
		sessionRequestProcessor.kmsDecryptor = mockKmsJwtAdapter;
		// @ts-ignore
		sessionRequestProcessor.validationHelper = mockValidationHelper;
	});

	it("should report unrecognised client", async () => {

		// Arrange

		// Act
		const response = await sessionRequestProcessor.processRequest(SESSION_WITH_INVALID_CLIENT);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "UNRECOGNISED_CLIENT",
			}),
		);
	});

	it("should report a JWE decryption failure", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockRejectedValue("error");

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_DECRYPTING_JWE",
			}),
		);
	});

	it("should report a failure to decode JWT", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockImplementation(() => {
			throw Error("Error");
		});

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_DECODING_JWT",
			}),
		);
	});

	it("should report a JWT verification failure", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(null);

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_VERIFYING_JWT",
			}),
		);
	});

	it("should report an unexpected error verifying JWT", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockRejectedValue({});

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "UNEXPECTED_ERROR_VERIFYING_JWT",
			}),
		);
	});

	it("should report a JWT validation failure", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("errors");

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_VALIDATING_JWT",
			}),
		);
	});

	it("should report invalid address countryCode failure", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"Invalid country code in the postalAddress", errorMessageCode: MessageCodes.INVALID_COUNTRY_CODE });

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.INVALID_COUNTRY_CODE,
			}),
		);
	});

	it("should report invalid address format failure", async () => {

		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"Missing all or some of mandatory postalAddress fields (subBuildingName, buildingName, buildingNumber and streetName), unable to create the session", errorMessageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS });

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: MessageCodes.MISSING_ALL_MANDATORY_POSTAL_ADDRESS_FIELDS,
			}),
		);
	});

	it("should report session already exists", async () => {
		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(sessionItemFactory());

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "SESSION_ALREADY_EXISTS",
			}),
		);
		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
	});

	it("should fail to create a session", async () => {
		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockRejectedValue("error");

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				messageCode: "FAILED_CREATING_SESSION",
			}),
		);
		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
	});

	it("should create a new session", async () => {
		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
		expect(response.statusCode).toBe(HttpCodesEnum.OK);
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: expect.any(String),
			govuk_signin_journey_id: "abcdef",
		});
	});

	it("should create a new session but report a TxMA failure", async () => {
		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();
		mockF2fService.sendToTXMA.mockRejectedValue("failed");

		// Act
		const response = await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
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
	});

	// the test below fails as the session processor is not writing the expiryDate value correctly in
	// seconds, it is writing it in ms. To be fixed in separate ticket
	it("the session created should have a valid expiryDate", async () => {
		// Arrange
		mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
		mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
		mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
		mockValidationHelper.isJwtValid.mockReturnValue("");
		mockValidationHelper.isAddressFormatValid.mockReturnValue({ errorMessage:"", errorMessageCode: "" });
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		mockF2fService.createAuthSession.mockResolvedValue();
		mockF2fService.savePersonIdentity.mockRejectedValue("error");
		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.000Z

		// Act
		await sessionRequestProcessor.processRequest(VALID_SESSION);

		// Assert
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
});
