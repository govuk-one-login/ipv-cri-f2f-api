/* eslint-disable @typescript-eslint/unbound-method */
import { Metrics } from "@aws-lambda-powertools/metrics";
import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import {
	 MockFailingKmsSigningJwtAdapter,
	MockKmsSigningTokenJwtAdapter,
} from "../utils/MockJwtVerifierSigner";
import { AccessTokenRequestProcessor } from "../../../services/AccessTokenRequestProcessor";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MISSING_BODY_ACCESSTOKEN } from "../data/accessToken-events";
import { VALID_ACCESSTOKEN } from "../data/accessToken-events";
import { Constants } from "../../../utils/Constants";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "crypto";
 import { AppError } from "../../../utils/AppError";
 import { MessageCodes } from "../../../models/enums/MessageCodes";

let accessTokenRequestProcessorTest: AccessTokenRequestProcessor;
let mockSession: ISessionItem;
let request: APIGatewayProxyEvent;

jest.mock("../../../utils/KmsJwtAdapter");
const logger = mock<Logger>();
const metrics = mock<Metrics>();
const mockF2fService = mock<F2fService>();

const ENCODED_REDIRECT_URI = encodeURIComponent("http:localhost:8085/callback");
const AUTHORIZATION_CODE = randomUUID();

const passingKmsJwtAdapterFactory = () => new MockKmsSigningTokenJwtAdapter();
const failingKmsJwtSigningAdapterFactory = () => new MockFailingKmsSigningJwtAdapter();

function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "b0668808-67ce-8jc7-a2fc-132b81612111",
		clientId: "ipv-core-stub",
		accessToken: "AbCdEf123456",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 123,
		redirectUri: "http:localhost:8085/callback",
		accessTokenExpiryDate: 1234,
		expiryDate: 123,
		createdDate: 123,
		state: "initial",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_AUTH_CODE_ISSUED,
	};
	return sess;
}

const clientAssertionJwt = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjVkNmVjNzQxM2FlOGJmMmVhN2M0MTZlNzY2YmE5YjkyOTliNjdlYWY5ZTE0Zjk4NGUyZjc5OGE0OGJmNmM5MjEifQ.eyJpc3MiOiJodHRwczovL2lwdi5jb3JlLmFjY291bnQuZ292LnVrIiwic3ViIjoiNWFkNThjMDEtMzY3Mi00ZTIyLWJkMWItOTE1MWYzZDc2NmMxIiwiYXVkIjoiaHR0cHM6Ly9yZXZpZXctby5kZXYuYWNjb3VudC5nb3YudWsiLCJqdGkiOiI0YjUwNjdhMzM1YjE1ODU5OGViMjE3ODg3Y2ZlODMyMiIsImV4cCI6MTc0OTYzNzA3OSwiaWF0IjoxNzQ5NjM2ODk5fQ.ww8_MdgOYS70XGtsWWk-rPBR_3IXSyLd2Tl61J3M1EGBPM3HKUFmWA6N-dq82IpBoGpkn1Nj_qeWNO3Mo50Reg";

describe("AccessTokenRequestProcessor", () => {
	beforeAll(() => {
		mockSession = getMockSessionItem();
		accessTokenRequestProcessorTest = new AccessTokenRequestProcessor(logger, metrics);
		//@ts-expect-error linting to be updated
		accessTokenRequestProcessorTest.f2fService = mockF2fService;
		request = VALID_ACCESSTOKEN;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		//@ts-expect-error linting to be updated
		accessTokenRequestProcessorTest.kmsJwtAdapter = passingKmsJwtAdapterFactory();
		request.body = `code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}&client_assertion_type=${Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER}&client_assertion=${clientAssertionJwt}`;
		mockSession = getMockSessionItem();
		mockF2fService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);
	});

	 it("Return bearer access token response when grant_type, code, and redirect_uri parameters are provided", async () => {
	 	mockF2fService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);

	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);
	 	expect(mockF2fService.getSessionByAuthorizationCode).toHaveBeenCalledTimes(1);

	 	expect(out.body).toEqual(JSON.stringify({
	 		"access_token": "ACCESS_TOKEN",
	 		"token_type": Constants.BEARER,
	 		"expires_in": Constants.TOKEN_EXPIRY_SECONDS,
	 	}));
	 	expect(out.statusCode).toBe(HttpCodesEnum.OK);

	 	expect(logger.appendKeys).toHaveBeenCalledWith({ govuk_signin_journey_id: mockSession.clientSessionId });
	 	expect(logger.appendKeys).toHaveBeenCalledWith({ sessionId: mockSession.sessionId });
	 });

	 it("Returns 401 Unauthorized response when body is missing", async () => {
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(MISSING_BODY_ACCESSTOKEN);

		expect(logger.error).toHaveBeenCalledWith("Failed validating the Access token request body.", {"error": "Invalid request: missing body", "messageCode": "FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY"});
	 	expect(out.body).toBe("Invalid request: missing body");
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it.each([
	 	[`grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`, "Invalid request: Missing code parameter"],
	 	[`code=${AUTHORIZATION_CODE}&redirect_uri=${ENCODED_REDIRECT_URI}`, "Invalid grant_type parameter"],
	 	[`code=${AUTHORIZATION_CODE}&grant_type=authorization_code`, "Invalid request: Missing redirect_uri parameter"],
	 ])("When parameters are not provided in the body, it returns 401 Unauthorized response", async (body, errMsg) => {
	 	request.body = body;
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

		expect(logger.error).toHaveBeenCalledWith("Failed validating the Access token request body.", {"error": errMsg, "messageCode": "FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY"});
	 	expect(out.body).toBe(errMsg);
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);

	 });

	it("Returns 401 Unauthorized response when grant_type parameter is not equal to 'authorization_code'", async () => {
		request.body = `code=${AUTHORIZATION_CODE}&grant_type=WRONG_CODE&redirect_uri=${ENCODED_REDIRECT_URI}`;
		const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

		expect(logger.error).toHaveBeenCalledWith("Failed validating the Access token request body.", {"error": "Invalid grant_type parameter", "messageCode": "FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY"});
		expect(out.body).toBe("Invalid grant_type parameter");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	 it("Returns 401 Unauthorized response when code parameter is not a valid UUID", async () => {
	 	request.body = `code=1234&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`;
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

		expect(logger.error).toHaveBeenCalledWith("Failed validating the Access token request body.", {"error": "AuthorizationCode must be a valid uuid", "messageCode": "FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY"});
	 	expect(out.body).toBe("AuthorizationCode must be a valid uuid");
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it("Return 401 Unauthorized response when AuthSessionState is not F2F_AUTH_CODE_ISSUED", async () => {
	 	mockSession.authSessionState = AuthSessionState.F2F_ACCESS_TOKEN_ISSUED;
	 	mockF2fService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(logger.warn).toHaveBeenCalledWith(
	 				"Session for journey sdfssg is in the wrong Auth state: expected state - F2F_AUTH_CODE_ISSUED, actual state - F2F_ACCESS_TOKEN_ISSUED", { messageCode: MessageCodes.INCORRECT_SESSION_STATE },
	 	);
	 	expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "AccessToken_error_user_state_incorrect", MetricUnits.Count, 1);	

	 	expect(out.body).toBe("Session for journey sdfssg is in the wrong Auth state: expected state - F2F_AUTH_CODE_ISSUED, actual state - F2F_ACCESS_TOKEN_ISSUED");
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it("Returns 401 Unauthorized response when redirect_uri parameter does not match the value in SessionTable", async () => {
	 	request.body = `code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=TEST_REDIRECT_URI&client_assertion_type=${Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER}&client_assertion=${clientAssertionJwt}`;
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(out.body).toBe("Invalid request: redirect uri TEST_REDIRECT_URI does not match configuration uri http:localhost:8085/callback");
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it("Return 401 Unauthorized response when session was not found in the DB for a authorizationCode", async () => {
	 	mockF2fService.getSessionByAuthorizationCode.mockResolvedValue(undefined);

	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(out.body).toBe("No session found by authorization code: " + AUTHORIZATION_CODE);
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it("Return 500 Server Error when Failed to sign the access token Jwt", async () => {
	 	//@ts-expect-error linting to be updated
	 	accessTokenRequestProcessorTest.kmsJwtAdapter = failingKmsJwtSigningAdapterFactory();
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(out.body).toContain("Failed to sign the accessToken Jwt");
	 	expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
	 });

	 it("Return 401 when getting session from dynamoDB errors", async () => {
	 	mockF2fService.getSessionByAuthorizationCode.mockImplementation(() => {
	 		throw new Error("Error while retrieving the session");
	 	});
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(out.body).toContain("Error while retrieving the session");
	 	expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	 });

	 it("Return 500 when updating the session returns an error", async () => {
	 	mockF2fService.updateSessionWithAccessTokenDetails.mockImplementation(() => {
	 		throw new AppError(HttpCodesEnum.SERVER_ERROR, "updateItem - failed: got error saving Access token details");
	 	});
	 	const out: APIGatewayProxyResult = await accessTokenRequestProcessorTest.processRequest(request);

	 	expect(out.body).toContain("updateItem - failed: got error saving Access token details");
	 	expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
	 });
});
