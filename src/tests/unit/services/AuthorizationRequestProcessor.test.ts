/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable max-lines-per-function */
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { F2fResponse } from "../../../utils/F2fResponse";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { AuthorizationRequestProcessor } from "../../../services/AuthorizationRequestProcessor";
import { VALID_AUTHCODE } from "../data/auth-events";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { APIGatewayProxyResult } from "aws-lambda";
import { MessageCodes } from "../../../models/enums/MessageCodes";

let authorizationRequestProcessorTest: AuthorizationRequestProcessor;
const mockF2fService = mock<F2fService>();

const logger = mock<Logger>();
const metrics = mock<Metrics>();


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
		// @ts-expect-error linting to be updated
		authorizationRequestProcessorTest.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("Return successful response with 200 OK when auth code", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		const f2fResp = new F2fResponse(JSON.parse(out.body ));

		expect(out.body).toEqual(JSON.stringify({
			authorizationCode: {
				value: `${f2fResp.authorizationCode.value}`,
			},
			redirect_uri: "http://localhost:8085/callback",
			state: "Y@atr",
		}));
		expect(mockF2fService.setAuthorizationCode).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {
			event_name: TxmaEventNames.F2F_CRI_AUTH_CODE_ISSUED,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp: 1585695600,
			event_timestamp_ms: 1585695600000,
			user: {
				govuk_signin_journey_id: "sdfssg",
				ip_address: "127.0.0.1",
				persistent_session_id: "sdgsdg",
				session_id: "sdfsdg",
				user_id: "sub",
			},
		});
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {
			event_name: TxmaEventNames.F2F_CRI_END,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp: 1585695600,
			event_timestamp_ms: 1585695600000,
			extensions: {
				"previous_govuk_signin_journey_id": "sdfssg",
				evidence: [
					{
						txn: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
					},
				],
			},
			user: {
				ip_address: "127.0.0.1",
				persistent_session_id: "sdgsdg",
				session_id: "sdfsdg",
				user_id: "sub",
			},
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 when session is expired", async () => {
		const sess = getMockSessionItem();
		sess.expiryDate = 1485695600;
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("Session with session id: 1234 has expired");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 when session with that session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);

		const out: APIGatewayProxyResult = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		expect(mockF2fService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("No session found with the session id: 1234");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 200 when write to txMA fails", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		const out: APIGatewayProxyResult = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		const f2fResp = new F2fResponse(JSON.parse(out.body ));

		expect(out.body).toEqual(JSON.stringify({
			authorizationCode: {
				value: `${f2fResp.authorizationCode.value}`,
			},
			redirect_uri: "http://localhost:8085/callback",
			state: "Y@atr",
		}));
		expect(mockF2fService.setAuthorizationCode).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_CRI_AUTH_CODE_ISSUED to SQS queue.", { "messageCode": "ERROR_WRITING_TXMA" });
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 Unauthorized response when AuthSessionState is not F2F_YOTI_SESSION_CREATED", async () => {
		const sess = getMockSessionItem();
		console.log("SESS!", sess)
		sess.authSessionState = AuthSessionState.F2F_AUTH_CODE_ISSUED;
		console.log("SESS!2", sess)
		mockF2fService.getSessionById.mockResolvedValue(sess);
		const out: APIGatewayProxyResult = await authorizationRequestProcessorTest.processRequest(VALID_AUTHCODE, "1234");

		expect(logger.warn).toHaveBeenCalledWith(
					{ message: "Session for journey sdfssg is in the wrong Auth state: expected state - F2F_YOTI_SESSION_CREATED, actual state - F2F_AUTH_CODE_ISSUED" }, { messageCode: MessageCodes.INCORRECT_SESSION_STATE },
		);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "AuthRequest_error_user_state_incorrect", MetricUnits.Count, 1);	

		expect(out.body).toBe("Session for journey sdfssg is in the wrong Auth state: expected state - F2F_YOTI_SESSION_CREATED, actual state - F2F_AUTH_CODE_ISSUED");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});
});
