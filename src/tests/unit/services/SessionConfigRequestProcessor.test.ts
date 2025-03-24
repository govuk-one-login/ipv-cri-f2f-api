/* eslint-disable @typescript-eslint/unbound-method */
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { VALID_SESSION_CONFIG } from "../data/session-config-events";
import { SessionConfigRequestProcessor } from "../../../services/SessionConfigRequestProcessor";
import { APIGatewayProxyResult } from "aws-lambda";

let sessionConfigRequestProcessorTest: SessionConfigRequestProcessor;
const mockF2fService = mock<F2fService>();

jest.mock("../../../utils/Config", () => {
	return {
		getParameter: jest.fn(() => "true" ),
	};
});

const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });

function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
		accessToken: "dummy",
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
		authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
		yotiSessionId: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
	};
	return sess;
}

describe("SessionConfigRequestProcessor", () => {
	beforeAll(() => {
		sessionConfigRequestProcessorTest = new SessionConfigRequestProcessor(logger, metrics);
		// @ts-expect-error linting to be updated
		sessionConfigRequestProcessorTest.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return successful response with 200 OK and with pcl_enabled flag when evidence_requested is missing", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		expect(out.body).toEqual(JSON.stringify({ pcl_enabled: "true" }));

		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return successful response with 200 OK and with pcl_enabled flag when evidence_requested is present and is set to 4", async () => {
		const sess = getMockSessionItem();
		sess.evidence_requested = { strengthScore: 4 };
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		expect(out.body).toEqual(JSON.stringify({ evidence_requested: { strengthScore: 4 }, pcl_enabled: "true" }));

		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return successful response with 200 OK and with pcl_enabled flag when evidence_requested is present but is set to less than 4", async () => {
		const sess = getMockSessionItem();
		sess.evidence_requested = { strengthScore: 3 };
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		expect(out.body).toEqual(JSON.stringify({ evidence_requested: { strengthScore: 3 }, pcl_enabled: "true" }));

		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 when session is expired", async () => {
		const sess = getMockSessionItem();
		sess.expiryDate = 1675458564;
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("Session with session id: 1234 has expired");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 when session with that session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("No session found with the session id: 1234");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

});
