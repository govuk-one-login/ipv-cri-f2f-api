import { mock } from "jest-mock-extended";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { AbortRequestProcessor } from "../../../services/AbortRequestProcessor";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { Response } from "../../../utils/Response";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const mockF2fService = mock<F2fService>();
const logger = mock<Logger>();

let abortRequestProcessor: AbortRequestProcessor;
let f2fSessionItem: ISessionItem;
const metrics = new Metrics({ namespace: "F2F" });
const sessionId = "RandomF2FSessionID";
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
    		// @ts-ignore
		abortRequestProcessor.f2fService = mockF2fService;
		f2fSessionItem = getMockSessionItem();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(abortRequestProcessor.processRequest(sessionId)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION table",
		}));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.warn).toHaveBeenCalledWith("Missing details in SESSION TABLE", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("returns successful response if session has already been aborted", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce({ ...f2fSessionItem, authSessionState: AuthSessionState.F2F_CRI_SESSION_ABORTED });

		const out: Response = await abortRequestProcessor.processRequest(sessionId);

		expect(out.statusCode).toBe(HttpCodesEnum.OK);
		expect(out.body).toBe("Session has already been aborted");
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.info).toHaveBeenCalledWith("Session has already been aborted");
	});

	it("updates auth session state and returns successful response if session has not been aborted", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		const out: Response = await abortRequestProcessor.processRequest(sessionId);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.updateSessionAuthState).toHaveBeenCalledWith(sessionId, AuthSessionState.F2F_CRI_SESSION_ABORTED);
		expect(out.statusCode).toBe(HttpCodesEnum.FOUND_REDIRECT);
		expect(out.body).toBe("Session has been aborted");
		expect(out.headers).toStrictEqual({ Location:`${f2fSessionItem.redirectUri}?error=access_denied&state=${AuthSessionState.F2F_CRI_SESSION_ABORTED}` });
	});

	it("sends TxMA event after auth session state has been updated", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		await abortRequestProcessor.processRequest(sessionId);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith(expect.objectContaining({
			event_name: "F2F_CRI_SESSION_ABORTED",
		}));
	});

	it("logs error if sending TxMA event fails, but successful response is still returned", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.sendToTXMA.mockRejectedValueOnce({});

		const out: Response = await abortRequestProcessor.processRequest(sessionId);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Auth session successfully aborted. Failed to send F2F_CRI_SESSION_ABORTED event to TXMA", {
  			error: {},
  			messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
		});
		expect(out.statusCode).toBe(HttpCodesEnum.FOUND_REDIRECT);
		expect(out.body).toBe("Session has been aborted");
	});

	it("returns failed response if auth session state cannot be updated", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockF2fService.updateSessionAuthState.mockRejectedValueOnce("Error updating auth session state");

		const out: Response = await abortRequestProcessor.processRequest(sessionId);

		expect(out.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(out.body).toBe("An error has occurred");
	});
});
