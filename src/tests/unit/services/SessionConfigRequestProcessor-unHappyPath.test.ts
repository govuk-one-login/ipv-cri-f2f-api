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
import { MessageCodes } from "../../../models/enums/MessageCodes";

let sessionConfigRequestProcessorTest: SessionConfigRequestProcessor;
const mockF2fService = mock<F2fService>();

jest.mock("../../../utils/Config", () => {
	return {
		getParameter: jest.fn().mockRejectedValue("error"),
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

describe("SessionConfigRequestProcessor-Missing pcl_enabled flag", () => {
	beforeAll(() => {
		sessionConfigRequestProcessorTest = new SessionConfigRequestProcessor(logger, metrics);
		// @ts-ignore
		sessionConfigRequestProcessorTest.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return successful response with 200 OK and logs error message when pcl enabled SSM param is missing.", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);

		const out: APIGatewayProxyResult = await sessionConfigRequestProcessorTest.processRequest(VALID_SESSION_CONFIG, "1234");

		expect(out.body).toEqual(JSON.stringify({}));

		expect(out.statusCode).toBe(HttpCodesEnum.OK);

		expect(logger.error).toHaveBeenCalledWith("Failed to get param from ssm at /dev/f2f/printedCustomerLetter/enabled", {"error": "error", "messageCode": MessageCodes.MISSING_PRINTED_CUSTOMER_LETTER_ENABLED_CONFIGURATION });
	});

});
