import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";
import { createDynamoDbClient } from "../../../utils/DynamoDBFactory";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { sqsClient } from "../../../utils/SqsClient";
import { TxmaEvent } from "../../../utils/TxmaEvent";
import { GovNotifyEvent } from "../../../utils/GovNotifyEvent";

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});

let f2fService: F2fService;
const tableName = "MYTABLE";
const sessionId = "SESSID";
const mockDynamoDbClient = jest.mocked(createDynamoDbClient());
const mockSqsClient = jest.mocked(sqsClient);
const SESSION_RECORD = require("../data/db_record.json");

const FAILURE_VALUE = "throw_me";

function getTXMAEventPayload(): TxmaEvent {
	const txmaEventPayload: TxmaEvent = {
		event_name: "F2F_YOTI_PDF_EMAILED",
		user: {
			user_id: "sessionCliendId",
			transaction_id: "",
			persistent_session_id: "sessionPersistentSessionId",
			session_id: "sessionID",
			govuk_signin_journey_id: "clientSessionId",
			ip_address: "sourceIp",
		},
		client_id: "clientId",
		timestamp: 123,
		component_id: "issuer",
	};
	return txmaEventPayload;
}

function getGovNotifyEventPayload(): GovNotifyEvent {
	const govNotifyEventPayload: GovNotifyEvent = {
		Message : {
			sessionId: "f2fSessionId",
			yotiSessionId: "yotiSessionId",
			emailAddress: "email@test.com",
			firstName: "John",
			lastName: "Doe",
			messageType: "email",
		},
	};
	return govNotifyEventPayload;
}


describe("F2f Service", () => {
	let txmaEventPayload: TxmaEvent, govNotifyEventPayload: GovNotifyEvent;
	
	beforeAll(() => {
		txmaEventPayload = getTXMAEventPayload();
		govNotifyEventPayload = getGovNotifyEventPayload();
	});

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

	it("Should not throw an error and return undefined when set AuthorizationCode F2F data doesn't exist", async () => {
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

	it("show throw error if failed to send to TXMA queue", async () => {
		mockSqsClient.send = jest.fn().mockRejectedValue({});

		return expect(f2fService.sendToTXMA(txmaEventPayload)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("show throw error if failed to send to GovNotify queue", async () => {
		mockSqsClient.send = jest.fn().mockRejectedValue({});

		return expect(f2fService.sendToGovNotify(govNotifyEventPayload)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});
});
