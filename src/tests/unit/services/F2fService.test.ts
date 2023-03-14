import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";
import { createDynamoDbClient } from "../../../utils/DynamoDBFactory";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "CIC",
});

let f2fService: F2fService;
const tableName = "MYTABLE";
const sessionId = "SESSID";
const authCode = "AUTHCODE";
const mockDynamoDbClient = jest.mocked(createDynamoDbClient());
const SESSION_RECORD = require("../data/db_record.json");

const FAILURE_VALUE = "throw_me";

describe("Cic Service", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		f2fService = new F2fService(tableName, logger, mockDynamoDbClient);

	});
	it("Should return a session item when passed a valid session Id", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: SESSION_RECORD });
		const result = await f2fService.getSessionById(sessionId);
		expect(result).toEqual({ sessionId: "SESSID" });
	});

	it("Should not throw an error and return undefined when session doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		return expect(f2fService.getSessionById("1234")).resolves.toBeUndefined();
	});

	it("Should not throw an error and return undefined when set AuthorizationCode CIC data doesn't exist", async () => {
		return expect(f2fService.setAuthorizationCode("SESSID", randomUUID())).resolves.toBeUndefined();
	});

	it("should throw 500 if request fails when setting AuthorizationCode", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		return expect(f2fService.setAuthorizationCode(FAILURE_VALUE, randomUUID())).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with access token details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		return expect(f2fService.updateSessionWithAccessTokenDetails("SESSID", 12345)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});
});
