import { ClaimedIdRequestProcessor } from "../../../services/ClaimedIdRequestProcessor";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { VALID_CLAIMEDID } from "../data/cic-events";
import { CicService } from "../../../services/CicService";
import { ISessionItem } from "../../../models/ISessionItem";
import { Response } from "../../../utils/Response";
import { CicResponse } from "../../../utils/CicResponse";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";

let claimedIdRequestProcessorTest: ClaimedIdRequestProcessor;
const mockCicService = mock<CicService>();

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "CIC",
});
const metrics = new Metrics({ namespace: "CIC" });

function getMockSessionItem() : ISessionItem {
	const sess: ISessionItem = {
		sessionId : "sdfsdg",
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
		full_name: "test user",
		date_of_birth: "09-08-1961",
		document_selected: "Passport",
		date_of_expiry: "23-04-1027",
		authSessionState: AuthSessionState.CIC_SESSION_CREATED,
	};
	return sess;
}

describe("ClaimedIdRequestProcessor", () => {
	beforeAll(() => {
		claimedIdRequestProcessorTest = new ClaimedIdRequestProcessor(logger, metrics);
		// @ts-ignore
		claimedIdRequestProcessorTest.cicService = mockCicService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return successful response with 200 OK when session is found", async () => {
		const sess = getMockSessionItem();
		mockCicService.getSessionById.mockResolvedValue(sess);

		const out: Response = await claimedIdRequestProcessorTest.processRequest(VALID_CLAIMEDID, "1234");
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockCicService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("");
		expect(out.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 when session is expired", async () => {
		const sess = getMockSessionItem();
		sess.expiryDate = 1675458564;
		mockCicService.getSessionById.mockResolvedValue(sess);

		const out: Response = await claimedIdRequestProcessorTest.processRequest(VALID_CLAIMEDID, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockCicService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("Session with session id: 1234 has expired");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});

	it("Return 401 when session with that session id not found in the DB", async () => {
		mockCicService.getSessionById.mockResolvedValue(undefined);

		const out: Response = await claimedIdRequestProcessorTest.processRequest(VALID_CLAIMEDID, "1234");

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockCicService.getSessionById).toHaveBeenCalledTimes(1);
		expect(out.body).toBe("No session found with the session id: 1234");
		expect(out.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
	});
});
