import { mock } from "jest-mock-extended";
import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";
import { createDynamoDbClient } from "../../../utils/DynamoDBFactory";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { sqsClient } from "../../../utils/SqsClient";
import { TxmaEvent } from "../../../utils/TxmaEvent";
import { GovNotifyEvent } from "../../../utils/GovNotifyEvent";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { personIdentityInputRecord, personIdentityOutputRecord } from "../data/personIdentity-records";
import { AppError } from "../../../utils/AppError";

const logger = mock<Logger>();

let f2fService: F2fService;
const tableName = "SESSIONTABLE";
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
		Message: {
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
		f2fService = F2fService.getInstance(tableName, logger, mockDynamoDbClient);
	});

	it("Should return a session item when passed a valid session Id", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: SESSION_RECORD });
		const result = await f2fService.getSessionById(sessionId);
		expect(result).toEqual({ sessionId: "SESSID" });
	});

	it("Should not throw an error and return undefined when session doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await expect(f2fService.getSessionById("1234")).resolves.toBeUndefined();
	});

	it("Should not throw an error when session expiry date has passed", async () => {
		const expiredSession = {
			...SESSION_RECORD,
			expiryDate: absoluteTimeNow() - 500,
		};
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: expiredSession });
		try {
			await f2fService.getSessionById("1234");
		} catch (error) {
			expect(error).toEqual(new AppError(HttpCodesEnum.UNAUTHORIZED, "Session with session id: 1234 has expired"));
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(logger.error).toHaveBeenCalledWith({ message: "Session with session id: 1234 has expired" }, { messageCode: "EXPIRED_SESSION" });
		}
	});

	it("Should not throw an error and return undefined when set AuthorizationCode F2F data doesn't exist", async () => {
		await expect(f2fService.setAuthorizationCode("SESSID", randomUUID())).resolves.toBeUndefined();
	});

	it("should throw 500 if request fails when setting AuthorizationCode", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.setAuthorizationCode(FAILURE_VALUE, randomUUID())).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with access token details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.updateSessionWithAccessTokenDetails("SESSID", 12345)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with yoti session details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.updateSessionWithYotiIdAndStatus("SESSID", "12345", "4567")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("Should log success if session details update with Yoti SessionId", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValueOnce("Session Updated");
		await f2fService.updateSessionWithYotiIdAndStatus("123", "456", "YOTI_SESSION_CREATED");
		expect(logger.info).toHaveBeenCalledWith({ message: "Updated Yoti session details in dynamodb" });
	});

	it("show throw error if failed to send to TXMA queue", async () => {
		mockSqsClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.sendToTXMA(txmaEventPayload)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("show throw error if failed to send to GovNotify queue", async () => {
		mockSqsClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.sendToGovNotify(govNotifyEventPayload)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw error if failed to send to IPVCore queue", async () => {
		mockSqsClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.sendToIPVCore({
			sub: "",
			state: "",
			"https://vocab.account.gov.uk/v1/credentialJWT": [],
		})).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should return undefined when session item is not found by authorization code", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({ Items: [] });

		await expect(f2fService.getSessionByAuthorizationCode("1234")).rejects.toThrow("Error retrieving Session by authorization code");
	});

	it("should throw error when multiple session items are found by authorization code", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({ Items: [{ sessionId: "SESSID1" }, { sessionId: "SESSID2" }] });

		await expect(f2fService.getSessionByAuthorizationCode("1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
		expect(mockDynamoDbClient.query).toHaveBeenCalledWith(expect.objectContaining({
			KeyConditionExpression: "authorizationCode = :authorizationCode",
			ExpressionAttributeValues: {
				":authorizationCode": "1234",
			},
		}));
	});

	it("should throw error when session item has expired by authorization code", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({
			Items: [{
				sessionId: "SESSID",
				expiryDate: absoluteTimeNow() - 500,
			}],
		});

		await expect(f2fService.getSessionByAuthorizationCode("1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.UNAUTHORIZED,
		}));
		expect(mockDynamoDbClient.query).toHaveBeenCalledWith(expect.objectContaining({
			KeyConditionExpression: "authorizationCode = :authorizationCode",
			ExpressionAttributeValues: {
				":authorizationCode": "1234",
			},
		}));
	});

	it("should return session item when session is found by authorization code", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({
			Items: [{
				sessionId: "SESSID",
				expiryDate: absoluteTimeNow() + 500,
			}],
		});

		const result = await f2fService.getSessionByAuthorizationCode("1234");
		expect(result).toEqual({ sessionId: "SESSID", expiryDate: expect.any(Number) });
		expect(mockDynamoDbClient.query).toHaveBeenCalledWith(expect.objectContaining({
			KeyConditionExpression: "authorizationCode = :authorizationCode",
			ExpressionAttributeValues: {
				":authorizationCode": "1234",
			},
		}));
	});

	it("should update session auth state", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.updateSessionAuthState("SESSID", "AUTH_STATE");
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":authSessionState": "AUTH_STATE",
				},
				Key: {
					sessionId: "SESSID",
				},
				TableName: "SESSIONTABLE",
				UpdateExpression: "SET authSessionState = :authSessionState",
			},
		}));
	});

	it("should create auth session", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.createAuthSession(SESSION_RECORD);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				Item: {
					sessionId: "SESSID",
				},
				TableName: "SESSIONTABLE",
			},
		}));
	});

	it("should create and save a PersonIdentity record", async () => {
		// Arrange
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});

		// Act
		await f2fService.savePersonIdentity(personIdentityInputRecord, "1234");

		// Assert
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			clientCommand: expect.objectContaining({
				input: expect.objectContaining({
					Item: expect.objectContaining(personIdentityOutputRecord),
				}),
			}),
		}));

	});

	it("should add createdDate and expiryDate to a PersonIdentity record", async () => {
		// Arrange
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		jest.useFakeTimers();
		const fakeTime = 1684933200.123;
		jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.123Z

		// Act
		await f2fService.savePersonIdentity(personIdentityInputRecord, "1234");

		// Assert
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			clientCommand: expect.objectContaining({
				input: expect.objectContaining({
					Item: expect.objectContaining({
						expiryDate: Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL_SECS!),
						createdDate: Math.floor(fakeTime),
					}),
				}),
			}),
		}));
		jest.useRealTimers();
	});

	it("Should throw an error when session by yoti sessionId doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		try {
			await f2fService.getSessionByYotiId("1234");
		} catch (error) {
			expect(error).toEqual(new AppError(HttpCodesEnum.UNAUTHORIZED, "Error retrieving Session by yoti session id"));
			expect(logger.error).toHaveBeenCalledWith({ "message": "Error retrieving Session by yoti session id" }, { "messageCode": "FAILED_FETCHING_BY_YOTI_SESSIONID" });
		}
	});

	it("Should throw an error when Person record by sessionId doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		try {
			await f2fService.getPersonIdentityById("1234");
		} catch (error) {
			expect(error).toEqual(new AppError(HttpCodesEnum.UNAUTHORIZED, "Error retrieving Session"));
			expect(logger.error).toHaveBeenCalledWith({ "message": "getSessionById - failed executing get from dynamodb" }, { "error": {}, "messageCode": "FAILED_FETCHING_PERSON_IDENTITY" });
		}
	});
	it.each([
		["should update session table with updated ttl", "SESSID", 123456, "SESSIONTABLE"],
		["should update person identity table with updated ttl", "SESSID", 123456, "PERSONTABLE"],
	])("update ttl - %s", async (description, sessionId, expiryDate, tableName) => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.updateSessionTtl(sessionId, expiryDate, tableName);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":expiryDate": expiryDate,
				},
				Key: {
					sessionId,
				},
				TableName: tableName,
				UpdateExpression: "SET expiryDate = :expiryDate",
			},
		}));
	});
	

	it.each([
		["should throw 500 if fails to update session ttl", "SESSIONTABLE"],
		["should throw 500 if fails to update person identity ttl", "PERSONTABLE"],
	])("update ttl - %s", async (description, tableName) => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.updateSessionTtl(FAILURE_VALUE, 123456, tableName)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: `updateItem - failed: got error updating ${tableName} ttl`,
		}));
	});	
});
