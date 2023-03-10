import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { CicService } from "../../../services/CicService";
import { Response } from "../../../utils/Response";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import {
	MockFailingKmsSigningJwtAdapter,
	MockKmsSigningTokenJwtAdapter,
} from "../utils/MockJwtVerifierSigner";
import { AccessTokenRequestProcessor } from "../../../services/AccessTokenRequestProcessor";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MISSING_BODY_ACCESSTOKEN, VALID_ACCESSTOKEN } from "../data/accessToken-events";
import { Constants } from "../../../utils/Constants";
import { APIGatewayProxyEvent } from "aws-lambda";
import { randomUUID } from "crypto";
import { AppError } from "../../../utils/AppError";

let accessTokenRequestProcessorTest: AccessTokenRequestProcessor;
const mockCicService = mock<CicService>();
let mockSession : ISessionItem;
jest.mock("../../../utils/KmsJwtAdapter");
const passingKmsJwtAdapterFactory = (_signingKeys: string) => new MockKmsSigningTokenJwtAdapter();
const failingKmsJwtSigningAdapterFactory = (_signingKeys: string) => new MockFailingKmsSigningJwtAdapter();


const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "CIC",
});
const metrics = new Metrics({ namespace: "CIC" });
const ENCODED_REDIRECT_URI = encodeURIComponent("http://localhost:8085/callback");
const AUTHORIZATION_CODE = randomUUID();
let request : APIGatewayProxyEvent;

function getMockSessionItem() : ISessionItem {
	const sess: ISessionItem = {
		sessionId : "b0668808-67ce-8jc7-a2fc-132b81612111",
		clientId: "ipv-core-stub",
		accessToken: "AbCdEf123456",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 123,
		redirectUri: "http://localhost:8085/callback",
		accessTokenExpiryDate: 1234,
		expiryDate: 123,
		createdDate: 123,
		state: "initial",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		full_name: "test user",
		date_of_birth: "09-08-1961",
		document_selected: "Passport",
		date_of_expiry: "23-04-1027",
		authSessionState: AuthSessionState.CIC_AUTH_CODE_ISSUED,
	};
	return sess;
}

describe("AccessTokenRequestProcessor", () => {
	beforeAll(() => {
		mockSession = getMockSessionItem();
		accessTokenRequestProcessorTest = new AccessTokenRequestProcessor(logger, metrics);
		// @ts-ignore
		accessTokenRequestProcessorTest.cicService = mockCicService;
		request = VALID_ACCESSTOKEN;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		// @ts-ignore
		accessTokenRequestProcessorTest.kmsJwtAdapter = passingKmsJwtAdapterFactory();
		// Setting the request body with a valid params
		request.body = `code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`;
		mockSession = getMockSessionItem();
		mockCicService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);
	});

	it("Return bearer access token response when grant_type, code, and redirect_uri parameters are provided", async () => {
		mockCicService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);

		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockCicService.getSessionByAuthorizationCode).toHaveBeenCalledTimes(1);

		expect(out.body).toEqual(JSON.stringify({
			"access_token": "ACCESS_TOKEN",
			"token_type": Constants.BEARER,
			"expires_in": Constants.TOKEN_EXPIRY_SECONDS,
		}));
		expect(out.statusCode).toBe(HttpCodesEnum.CREATED);
	});

	it("Returns 401 Unauthorized response when body is missing", async () => {
		const out: Response = await accessTokenRequestProcessorTest.processRequest(MISSING_BODY_ACCESSTOKEN);

		expect(out.body).toBe("Invalid request: missing body");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it.each([
		[`grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`, "Invalid request: Missing code parameter"],
		[`code=${AUTHORIZATION_CODE}&redirect_uri=${ENCODED_REDIRECT_URI}`, "Invalid grant_type parameter"],
		[`code=${AUTHORIZATION_CODE}&grant_type=authorization_code`, "Invalid request: Missing redirect_uri parameter"],
	])("When parameters are not provided in the body, it returns 401 Unauthorized response", async (body, errMsg ) => {
		request.body = body;
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe(errMsg);
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);

	});

	it("Returns 401 Unauthorized response when grant_type parameter is not equal to 'authorization_code'", async () => {
		request.body = `code=${AUTHORIZATION_CODE}&grant_type=WRONG_CODE&redirect_uri=${ENCODED_REDIRECT_URI}`;
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe("Invalid grant_type parameter");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Returns 401 Unauthorized response when code parameter is not a valid UUID", async () => {
		request.body = `code=1234&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`;
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe("AuthorizationCode must be a valid uuid");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 Unauthorized response when AuthSessionState is not CIC_AUTH_CODE_ISSUED", async () => {
		mockSession.authSessionState = AuthSessionState.CIC_ACCESS_TOKEN_ISSUED;
		mockCicService.getSessionByAuthorizationCode.mockResolvedValue(mockSession);
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe("AuthSession is in wrong Auth state: Expected state- CIC_AUTH_CODE_ISSUED, actual state- CIC_ACCESS_TOKEN_ISSUED");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Returns 401 Unauthorized response when redirect_uri parameter does not match the value in SessionTable", async () => {
		request.body = `code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=TEST_REDIRECT_URI`;
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe("Invalid request: redirect uri TEST_REDIRECT_URI does not match configuration uri http://localhost:8085/callback");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 Unauthorized response when session was not found in the DB for a authorizationCode", async () => {
		mockCicService.getSessionByAuthorizationCode.mockResolvedValue(undefined);

		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toBe("No session found by authorization code: " + AUTHORIZATION_CODE);
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 500 Server Error when Failed to sign the access token Jwt", async () => {
		// @ts-ignore
		accessTokenRequestProcessorTest.kmsJwtAdapter = failingKmsJwtSigningAdapterFactory();
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toContain("Failed to sign the accessToken Jwt");
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
	});

	it("Return 401 when getting session from dynamoDB errors", async () => {
		// @ts-ignore
		mockCicService.getSessionByAuthorizationCode.mockImplementation(() => {
			throw new Error("Error while retrieving the session");
		});
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toContain("Error while retrieving the session");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 500 when updating the session returns an error", async () => {
		// @ts-ignore
		mockCicService.updateSessionWithAccessTokenDetails.mockImplementation(() => {
			throw new AppError("updateItem - failed: got error saving Access token details", HttpCodesEnum.SERVER_ERROR);
		});
		const out: Response = await accessTokenRequestProcessorTest.processRequest(request);

		expect(out.body).toContain("updateItem - failed: got error saving Access token details");
		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
	});
});
