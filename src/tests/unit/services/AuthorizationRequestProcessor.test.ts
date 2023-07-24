import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { Response } from "../../../utils/Response";
import { F2fResponse } from "../../../utils/F2fResponse";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { AuthorizationRequestProcessor } from "../../../services/AuthorizationRequestProcessor";
import { VALID_AUTHCODE } from "../data/auth-events";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";

let authorizationRequestProcessorTest: AuthorizationRequestProcessor;
const mockF2fService = mock<F2fService>();

const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });

function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
		accessToken: "AbCdEf123456",
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

describe("AuthorizationRequestProcessor", () => {
	beforeAll(() => {
		authorizationRequestProcessorTest = new AuthorizationRequestProcessor(logger, metrics);
		// @ts-ignore
		authorizationRequestProcessorTest.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return successful response with 200 OK when auth code", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: Response = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		const f2fResp = new F2fResponse(JSON.parse(out.body ));

		expect(out.body).toEqual(JSON.stringify({
			authorizationCode: {
				value: `${f2fResp.authorizationCode.value}`,
			},
			redirect_uri: "http://localhost:8085/callback",
			state: "Y@atr",
		}));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.setAuthorizationCode).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {
			event_name: "F2F_CRI_AUTH_CODE_ISSUED",
			client_id: "ipv-core-stub",
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp: absoluteTimeNow(),
			user: {
				govuk_signin_journey_id: "sdfssg",
				ip_address: "127.0.0.1",
				persistent_session_id: "sdgsdg",
				session_id: "sdfsdg",
				transaction_id: undefined,
				user_id: "sub",
			},
		});
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {
			event_name: "F2F_CRI_END",
			client_id: "ipv-core-stub",
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp: absoluteTimeNow(),
			extensions: {
				evidence: [
					{
						txn: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91"
					}
				]
			},
			user: {
				govuk_signin_journey_id: "sdfssg",
				ip_address: "127.0.0.1",
				persistent_session_id: "sdgsdg",
				session_id: "sdfsdg",
				transaction_id: undefined,
				user_id: "sub",
			},
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 when session is expired", async () => {
		const sess = getMockSessionItem();
		sess.expiryDate = 1675458564;
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: Response = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("Session with session id: 1234 has expired");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 when session with that session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);

		const out: Response = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("No session found with the session id: 1234");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 200 when write to txMA fails", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		const out: Response = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		const f2fResp = new F2fResponse(JSON.parse(out.body ));

		expect(out.body).toEqual(JSON.stringify({
			authorizationCode: {
				value: `${f2fResp.authorizationCode.value}`,
			},
			redirect_uri: "http://localhost:8085/callback",
			state: "Y@atr",
		}));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.setAuthorizationCode).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_CRI_AUTH_CODE_ISSUED to SQS queue.", { "messageCode": "ERROR_WRITING_TXMA" });
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});
});
