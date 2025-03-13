import { UserInfoRequestProcessor } from "../../../services/UserInfoRequestProcessor";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { MISSING_AUTH_HEADER_USERINFO, VALID_USERINFO } from "../data/userInfo-events";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { MockKmsJwtAdapter } from "../utils/MockJwtVerifierSigner";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { APIGatewayProxyResult } from "aws-lambda";

let userInforequestProcessorTest: UserInfoRequestProcessor;
const mockF2fService = mock<F2fService>();
let mockSession: ISessionItem;
const passingKmsJwtAdapterFactory = () => new MockKmsJwtAdapter(true);
const failingKmsJwtAdapterFactory = () => new MockKmsJwtAdapter(false);
const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "CIC" });

function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
		accessToken: "afas",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 123,
		redirectUri: "http",
		accessTokenExpiryDate: 1234,
		expiryDate: 123,
		createdDate: 123,
		state: "initial",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		given_names: ["given", "name"],
		family_names: ["family", "name"],
		date_of_birth: "09-08-1961",
		authSessionState: "F2F_ACCESS_TOKEN_ISSUED",
	};
	return sess;
}

describe("UserInfoRequestProcessor", () => {
	beforeAll(() => {
		mockSession = getMockSessionItem();
		userInforequestProcessorTest = new UserInfoRequestProcessor(logger, metrics);
		// @ts-expect-error linting to be updated
		userInforequestProcessorTest.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		// @ts-expect-error linting to be updated
		userInforequestProcessorTest.kmsJwtAdapter = passingKmsJwtAdapterFactory();
		mockSession = getMockSessionItem();
	});

	it("Return successful response with 200 OK when session is found for an accessToken", async () => {
		mockF2fService.getSessionById.mockResolvedValue(mockSession);

		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);
		 
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);

		expect(out.body).toEqual(JSON.stringify({
			sub: "sub",
			"https://vocab.account.gov.uk/v1/credentialStatus": "pending",
		}));
		expect(out.statusCode).toBe(HttpCodesEnum.ACCEPTED);
		 
		expect(logger.appendKeys).toHaveBeenCalledWith({
			govuk_signin_journey_id: "sdfssg",
		});
		 
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: "sdfsdg",
		});
	});

	it("Return 401 when Authorization header is missing in the request", async () => {
		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(MISSING_AUTH_HEADER_USERINFO);

		expect(out.body).toBe("Failed to Validate - Authentication header: Missing header: Authorization header value is missing or invalid auth_scheme");
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
	});

	it("Return 401 when access_token JWT validation fails", async () => {
		// @ts-expect-error linting to be updated
		userInforequestProcessorTest.kmsJwtAdapter = failingKmsJwtAdapterFactory();
		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);

		expect(out.body).toBe("Failed to Validate - Authentication header: Verification of JWT failed");
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
	});

	it("Return 401 when sub is missing from JWT access_token", async () => {
		// @ts-expect-error linting to be updated
		userInforequestProcessorTest.kmsJwtAdapter.mockJwt.payload.sub = null;
		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);

		expect(out.body).toBe("Failed to Validate - Authentication header: sub missing");
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
	});

	it("Return 401 when we receive expired JWT access_token", async () => {
		// @ts-expect-error linting to be updated
		userInforequestProcessorTest.kmsJwtAdapter.mockJwt.payload.exp = absoluteTimeNow() - 500;
		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);

		expect(out.body).toBe("Failed to Validate - Authentication header: Verification of exp failed");
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
	});

	it("Return 401 when session (based upon sub) was not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);

		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);

		 
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toContain("No session found with the sessionId: ");
		expect(out.statusCode).toBe(HttpCodesEnum.BAD_REQUEST);
		 
		expect(logger.error).toHaveBeenCalledWith(
			"No session found with the sessionId: sessionId", { messageCode: MessageCodes.SESSION_NOT_FOUND },
		);
	});

	it("Return 401 when AuthSessionState is not F2F_ACCESS_TOKEN_ISSUED", async () => {
		mockF2fService.getSessionById.mockResolvedValue(mockSession);
		mockSession.authSessionState = "F2F_AUTH_CODE_ISSUED";
		const out: APIGatewayProxyResult = await userInforequestProcessorTest.processRequest(VALID_USERINFO);

		 
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toContain("AuthSession is in wrong Auth state: Expected state- F2F_ACCESS_TOKEN_ISSUED, actual state- F2F_AUTH_CODE_ISSUED");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		 
		expect(logger.error).toHaveBeenCalledWith(
			{ message: "AuthSession is in wrong Auth state: Expected state- F2F_ACCESS_TOKEN_ISSUED, actual state- F2F_AUTH_CODE_ISSUED" }, { messageCode: MessageCodes.INCORRECT_SESSION_STATE },
		);
	});

});
