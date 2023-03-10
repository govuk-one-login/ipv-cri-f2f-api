import { CicService } from "../../../services/CicService";
import { Logger } from "@aws-lambda-powertools/logger";
import { CicSession } from "../../../models/CicSession";
import { randomUUID } from "crypto";
import { createDynamoDbClient } from "../../../utils/DynamoDBFactory";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "CIC",
});

let cicService: CicService;
const tableName = "MYTABLE";
const sessionId = "SESSID";
const authCode = "AUTHCODE";
const mockDynamoDbClient = jest.mocked(createDynamoDbClient());
const SESSION_RECORD = require("../data/db_record.json");

const FAILURE_VALUE = "throw_me";

describe("Cic Service", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	 	cicService = new CicService(tableName, logger, mockDynamoDbClient);

	 });
	it("Should return a session item when passed a valid session Id", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: SESSION_RECORD });
		const result = await cicService.getSessionById(sessionId);
		expect(result).toEqual({ sessionId: "SESSID" });
	});

	it("Should not throw an error and return undefined when session doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		return expect(cicService.getSessionById("1234")).resolves.toBeUndefined();
	});


	it("should throw 500 if request fails during save CIC data", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		const cicSess = new CicSession({ full_name: "Test", date_of_birth: "1970-01-01", document_selected: "passport", date_of_expiry: "1970-01-01" });

		return expect(cicService.saveCICData(FAILURE_VALUE, cicSess)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("Should not throw an error and return undefined when set AuthorizationCode CIC data doesn't exist", async () => {
		return expect(cicService.setAuthorizationCode("SESSID", randomUUID())).resolves.toBeUndefined();
	});

	it("should throw 500 if request fails when setting AuthorizationCode", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		return expect(cicService.setAuthorizationCode(FAILURE_VALUE, randomUUID())).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with access token details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		return expect(cicService.updateSessionWithAccessTokenDetails("SESSID", 12345)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});
});
