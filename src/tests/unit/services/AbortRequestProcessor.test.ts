import { mock } from "jest-mock-extended";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { AbortRequestProcessor } from "../../../services/AbortRequestProcessor";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { APIGatewayProxyResult } from "aws-lambda";

const mockF2fService = mock<F2fService>();
const logger = mock<Logger>();

let abortRequestProcessor: AbortRequestProcessor;
let f2fSessionItem: ISessionItem;
const metrics = mock<Metrics>();
const sessionId = "RandomF2FSessionID";
const encodedHeader = "ENCHEADER";
function getMockSessionItem(): ISessionItem {
	const sessionInfo: ISessionItem = {
		sessionId,
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
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

describe("AbortRequestProcessor", () => {
	beforeAll(() => {
		abortRequestProcessor = new AbortRequestProcessor(logger, metrics);
    		// @ts-expect-error linting to be updated
		abortRequestProcessor.f2fService = mockF2fService;
		f2fSessionItem = getMockSessionItem();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(abortRequestProcessor.processRequest(sessionId, encodedHeader)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION table",
		}));
		 
		expect(logger.warn).toHaveBeenCalledWith("Missing details in SESSION TABLE", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("returns successful response if session has already been aborted", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce({ ...f2fSessionItem, authSessionState: AuthSessionState.F2F_CRI_SESSION_ABORTED });

		const out: APIGatewayProxyResult = await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Session has already been aborted");
		 
		expect(logger.info).toHaveBeenCalledWith("Session has already been aborted");
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("updates auth session state and returns successful response if session has not been aborted", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		const out: APIGatewayProxyResult = await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		 
		expect(mockF2fService.updateSessionAuthState).toHaveBeenCalledWith(sessionId, AuthSessionState.F2F_CRI_SESSION_ABORTED);
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Session has been aborted");
		expect(out.headers?.Location).toBe(encodeURIComponent(`${f2fSessionItem.redirectUri}?error=access_denied&state=${f2fSessionItem.state}`));
		expect(metrics.addMetric).toHaveBeenCalledWith("state-F2F_CRI_SESSION_ABORTED", MetricUnits.Count, 1)
	});

	it("Returns successful response if session has not been aborted and redirectUri contains f2f id", async () => {
		const f2fSessionItemClone = f2fSessionItem;
		f2fSessionItemClone.redirectUri = "http://localhost:8085/callback?id=f2f";
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		const out: APIGatewayProxyResult = await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		 
		expect(mockF2fService.updateSessionAuthState).toHaveBeenCalledWith(sessionId, AuthSessionState.F2F_CRI_SESSION_ABORTED);
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Session has been aborted");
		expect(out.headers?.Location).toContain(encodeURIComponent(`${f2fSessionItem.redirectUri}&error=access_denied&state=${f2fSessionItem.state}`));
		expect(metrics.addMetric).toHaveBeenCalledWith("state-F2F_CRI_SESSION_ABORTED", MetricUnits.Count, 1)
	});

	it("sends TxMA event after auth session state has been updated", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		 
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(expect.objectContaining({
			event_name: TxmaEventNames.F2F_CRI_SESSION_ABORTED,
		}), encodedHeader);
		expect(metrics.addMetric).toHaveBeenCalledWith("state-F2F_CRI_SESSION_ABORTED", MetricUnits.Count, 1)
	});

	it("logs error if sending TxMA event fails, but successful response is still returned", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.sendToTXMA.mockRejectedValueOnce({});

		const out: APIGatewayProxyResult = await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		 
		expect(logger.error).toHaveBeenCalledWith("Auth session successfully aborted. Failed to send F2F_CRI_SESSION_ABORTED event to TXMA", {
  			error: {},
  			messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
		});
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Session has been aborted");
		expect(metrics.addMetric).toHaveBeenCalledWith("state-F2F_CRI_SESSION_ABORTED", MetricUnits.Count, 1)
	});

	it("returns failed response if auth session state cannot be updated", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.updateSessionAuthState.mockRejectedValueOnce("Error updating auth session state");

		const out: APIGatewayProxyResult = await abortRequestProcessor.processRequest(sessionId, encodedHeader);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error has occurred");
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});
});
