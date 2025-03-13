/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { mock } from "jest-mock-extended";
import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";
import { createDynamoDbClient } from "../../../utils/DynamoDBFactory";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { TxmaEvent } from "../../../utils/TxmaEvent";
import { GovNotifyEvent } from "../../../utils/GovNotifyEvent";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { personIdentityInputRecord, personIdentityOutputRecord, personIdentityOutputRecordTwoAddresses } from "../data/personIdentity-records";
import { postalAddressSameInputRecord, postalAddressDifferentInputRecord } from "../data/postalAddress-events";
import { createSqsClient } from "../../../utils/SqsClient";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { PdfPreferenceEnum } from "../../../utils/PdfPreferenceEnum";

const logger = mock<Logger>();
let f2fService: F2fService;
const tableName = "SESSIONTABLE";
const personTableName = "PERSONTABLE";
const sessionId = "SESSID";
const mockDynamoDbClient = jest.mocked(createDynamoDbClient());
const mockSqsClient = createSqsClient();
import SESSION_RECORD from "../data/db_record.json";
import { ISessionItem } from "../../../models/ISessionItem";

jest.mock("@aws-sdk/client-sqs", () => ({
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	SendMessageCommand: jest.fn().mockImplementation(() => {}),
}));

const FAILURE_VALUE = "throw_me";

const getTXMAEventPayload = (): TxmaEvent => ({
	event_name: TxmaEventNames.F2F_YOTI_PDF_EMAILED,
	user: {
		user_id: "sessionCliendId",
		persistent_session_id: "sessionPersistentSessionId",
		session_id: "sessionID",
		govuk_signin_journey_id: "clientSessionId",
		ip_address: "sourceIp",
	},
	timestamp: 123,
	event_timestamp_ms: 123000,
	component_id: "issuer",
});

function getGovNotifyEventPayload(): GovNotifyEvent {
	const govNotifyEventPayload: GovNotifyEvent = {
		Message: {
			sessionId: "f2fSessionId",
			yotiSessionId: "yotiSessionId",
			emailAddress: "email@test.com",
			firstName: "John",
			lastName: "Doe",
			messageType: "email",
			pdfPreference: "email",
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
		expect(result).toEqual({ sessionId });
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
		await expect(f2fService.getSessionById("1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.UNAUTHORIZED,
			message: "Session with session id: 1234 has expired",
		}));
		expect(logger.error).toHaveBeenCalledWith({ message: "Session with session id: 1234 has expired" }, { messageCode: "EXPIRED_SESSION" });
	});

	it("Should not throw an error and return undefined when set AuthorizationCode F2F data doesn't exist", async () => {
		await expect(f2fService.setAuthorizationCode(sessionId, randomUUID())).resolves.toBeUndefined();
	});

	it("should throw 500 if request fails when setting AuthorizationCode", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.setAuthorizationCode(FAILURE_VALUE, randomUUID())).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with access token details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.updateSessionWithAccessTokenDetails(sessionId, 12345)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("should throw 500 if request fails during update Session data with yoti session details", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});

		await expect(f2fService.updateSessionWithYotiIdAndStatus(sessionId, "12345", "4567")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
		}));
	});

	it("Should log success if session details update with Yoti SessionId", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValueOnce("Session Updated");
		await f2fService.updateSessionWithYotiIdAndStatus("123", "456", "YOTI_SESSION_CREATED");
		expect(logger.info).toHaveBeenCalledWith({ message: "Updated Yoti session details in dynamodb" });
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
				sessionId,
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
				sessionId,
				expiryDate: absoluteTimeNow() + 500,
			}],
		});

		const result = await f2fService.getSessionByAuthorizationCode("1234");
		expect(result).toEqual({ sessionId, expiryDate: expect.any(Number) });
		expect(mockDynamoDbClient.query).toHaveBeenCalledWith(expect.objectContaining({
			KeyConditionExpression: "authorizationCode = :authorizationCode",
			ExpressionAttributeValues: {
				":authorizationCode": "1234",
			},
		}));
	});

	it("should return empty array when session items are not found by auth session state", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({ Items: [] });

		const result = await f2fService.getSessionsByAuthSessionStates(["F2F_SESSION_STARTED"]);
		expect(result).toEqual([]);
	});

	it("should not return any session Items if the expiryDate has passed", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({
			Items: [
				{
					sessionId: "SESSIDTHREE",
					expiryDate: absoluteTimeNow() - 500,
				},
				{
					sessionId: "SESSIDTHREE",
					expiryDate: absoluteTimeNow() - 300,
				},
			],
		});

		const result = await f2fService.getSessionsByAuthSessionStates(["F2F_SESSION_STARTED"]);
		expect(result).toEqual([]);
	});

	it("should return session items when sessions are found matching the auth session state", async () => {
		mockDynamoDbClient.query = jest.fn().mockResolvedValue({
			Items: [{
				sessionId,
				expiryDate: absoluteTimeNow() + 500,
			},
			{
				sessionId: "SESSIDTWO",
				expiryDate: absoluteTimeNow() + 500,
			},
			{
				sessionId: "SESSIDTHREE",
				expiryDate: absoluteTimeNow() + 500,
			}],
		});

		const result = await f2fService.getSessionsByAuthSessionStates(["F2F_YOTI_SESSION_CREATED", "F2F_AUTH_CODE_ISSUED", "F2F_ACCESS_TOKEN_ISSUED"]);
		expect(result).toEqual([
			{ "expiryDate": expect.any(Number), sessionId },
			{ "expiryDate": expect.any(Number), "sessionId": "SESSIDTWO" },
			{ "expiryDate": expect.any(Number), "sessionId": "SESSIDTHREE" },
		]);
		expect(mockDynamoDbClient.query).toHaveBeenNthCalledWith(1, {
			"ExpressionAttributeValues": { ":authSessionState": "F2F_YOTI_SESSION_CREATED" },
			"IndexName": "authSessionState-updated-index",
			"KeyConditionExpression": "authSessionState = :authSessionState",
			"TableName": "SESSIONTABLE",
		});
		expect(mockDynamoDbClient.query).toHaveBeenNthCalledWith(2, {
			"ExpressionAttributeValues": { ":authSessionState": "F2F_AUTH_CODE_ISSUED" },
			"IndexName": "authSessionState-updated-index",
			"KeyConditionExpression": "authSessionState = :authSessionState",
			"TableName": "SESSIONTABLE",
		});
		expect(mockDynamoDbClient.query).toHaveBeenNthCalledWith(3, {
			"ExpressionAttributeValues": { ":authSessionState": "F2F_ACCESS_TOKEN_ISSUED" },
			"IndexName": "authSessionState-updated-index",
			"KeyConditionExpression": "authSessionState = :authSessionState",
			"TableName": "SESSIONTABLE",
		});
	});


	it("should update session with reminded flag", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.updateReminderEmailFlag(sessionId, true);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":reminderEmailSent": true,
				},
				Key: {
					sessionId,
				},
				TableName: "SESSIONTABLE",
				UpdateExpression: "SET reminderEmailSent = :reminderEmailSent",
			},
		}));
	});

	it("should update session with expired notification flag", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.markSessionAsExpired(sessionId);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":expiredNotificationSent": true,
					":authSessionState": "F2F_SESSION_EXPIRED",
				},
				Key: {
					sessionId,
				},
				TableName: "SESSIONTABLE",
				UpdateExpression: "SET expiredNotificationSent = :expiredNotificationSent, authSessionState = :authSessionState",
			},
		}));
	});


	it("should update session auth state", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.updateSessionAuthState(sessionId, "AUTH_STATE");
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":authSessionState": "AUTH_STATE",
				},
				Key: {
					sessionId,
				},
				TableName: "SESSIONTABLE",
				UpdateExpression: "SET authSessionState = :authSessionState",
			},
		}));
	});

	it("should create auth session", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.createAuthSession(SESSION_RECORD as ISessionItem);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				Item: {
					sessionId,
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
		await expect(f2fService.getSessionByYotiId("1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Error retrieving Session by yoti session id",
		}));
		expect(logger.error).toHaveBeenCalledWith({ "message": "Error retrieving Session by yoti session id" }, { "messageCode": "FAILED_FETCHING_BY_YOTI_SESSIONID" });
	});

	it("Should throw an error when Person record by sessionId doesn't exist", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.getPersonIdentityById("1234")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "Error retrieving Session",
		}));
		expect(logger.error).toHaveBeenCalledWith({ "message": "getSessionById - failed executing get from dynamodb" }, { "error": {}, "messageCode": "FAILED_FETCHING_PERSON_IDENTITY" });
	});

	it.each([
		["should update session table with updated ttl", 123456, "SESSIONTABLE"],
		["should update person identity table with updated ttl", 123456, "PERSONTABLE"],
	])("update ttl - %s", async (description, expiryDate, testTableName) => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.updateSessionTtl(sessionId, expiryDate, testTableName);
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":expiryDate": expiryDate,
				},
				Key: {
					sessionId,
				},
				TableName: testTableName,
				UpdateExpression: "SET expiryDate = :expiryDate",
			},
		}));
	});
	

	it.each([
		["should throw 500 if fails to update session ttl", "SESSIONTABLE"],
		["should throw 500 if fails to update person identity ttl", "PERSONTABLE"],
	])("update ttl - %s", async (description, testTableName) => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.updateSessionTtl(FAILURE_VALUE, 123456, testTableName)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: `updateItem - failed: got error updating ${testTableName} ttl`,
		}));
	});	

	it("should update session table with documentUsed", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({});
		await f2fService.addUsersSelectedDocument(sessionId, "passport", "SESSIONTABLE");
		expect(mockDynamoDbClient.send).toHaveBeenCalledWith(expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":documentUsed": "passport",
				},
				Key: {
					sessionId,
				},
				TableName: tableName,
				UpdateExpression: "SET documentUsed = :documentUsed",
			},
		}));
	});
	

	it("should throw 500 if fails to update documentUsed", async () => {
		mockDynamoDbClient.send = jest.fn().mockRejectedValue({});
		await expect(f2fService.addUsersSelectedDocument(sessionId, "passport", "SESSIONTABLE")).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "updateItem - failed: got error updating SESSIONTABLE",
		}));
	});	

	it("should add user PDF instructions preference to the person record if email only chosen", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: personIdentityOutputRecord });
		await f2fService.saveUserPdfPreferences(sessionId, PdfPreferenceEnum.EMAIL_ONLY, undefined, personTableName);
		expect(mockDynamoDbClient.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":pdfPreference": PdfPreferenceEnum.EMAIL_ONLY,
				},
				Key: {
					sessionId,
				},
				TableName: personTableName,
				UpdateExpression: "SET pdfPreference = :pdfPreference",
			},
		}));
	});

	it("should add user PDF instructions preference to the person record if letter chosen but postal address matches shared claims", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: personIdentityOutputRecord });
		await f2fService.saveUserPdfPreferences(sessionId, PdfPreferenceEnum.PRINTED_LETTER, postalAddressSameInputRecord, personTableName);
		expect(mockDynamoDbClient.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":pdfPreference": PdfPreferenceEnum.PRINTED_LETTER,
				},
				Key: {
					sessionId,
				},
				TableName: personTableName,
				UpdateExpression: "SET pdfPreference = :pdfPreference",
			},
			
		}),
		);
	});

	it("should add user PDF instructions preference and postal address to the person record if letter chosen and postal address is different to shared claims", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValue({ Item: personIdentityOutputRecordTwoAddresses });
		await f2fService.saveUserPdfPreferences(sessionId, PdfPreferenceEnum.PRINTED_LETTER, postalAddressDifferentInputRecord, personTableName);
		expect(mockDynamoDbClient.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
			input: {
				ExpressionAttributeValues: {
					":pdfPreference": PdfPreferenceEnum.PRINTED_LETTER,
					":addresses": [personIdentityOutputRecordTwoAddresses.addresses[0], postalAddressDifferentInputRecord],
				},
				Key: {
					sessionId,
				},
				TableName: personTableName,
				UpdateExpression: "SET pdfPreference = :pdfPreference, addresses = :addresses",
			},
			
		}),
		);
	});

	it("should throw an error when update fails for pdfPreference", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValueOnce({ Item: personIdentityOutputRecord }).mockRejectedValue({});
		await expect(f2fService.saveUserPdfPreferences(sessionId, PdfPreferenceEnum.PRINTED_LETTER, postalAddressSameInputRecord, personTableName)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "updateItem - failed: got error updating pdfPreference in PERSONTABLE",
		}));
	});

	it("should throw an error when update fails for pdfPreference or postal address", async () => {
		mockDynamoDbClient.send = jest.fn().mockResolvedValueOnce({ Item: personIdentityOutputRecordTwoAddresses }).mockRejectedValue({});
		await expect(f2fService.saveUserPdfPreferences(sessionId, PdfPreferenceEnum.PRINTED_LETTER, postalAddressDifferentInputRecord, personTableName)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.SERVER_ERROR,
			message: "updateItem - failed: got error updating pdfPreference or postal address details in PERSONTABLE",
		}));
	});

	describe("obfuscateJSONValues", () => {
		it("should obfuscate all fields except those in txmaFieldsToShow", async () => {
			const inputObject = {
				field1: "sensitive1",
				field2: "sensitive2",
				field3: "non-sensitive",
				nested: {
					field4: "sensitive3",
					field5: "non-sensitive",
					field6: null,
					field7: undefined,
				},
			};
	
			const txmaFieldsToShow = ["field3", "field5"];
	
			const obfuscatedObject = await f2fService.obfuscateJSONValues(inputObject, txmaFieldsToShow);
	
			// Check that sensitive fields are obfuscated and non-sensitive fields are not
			expect(obfuscatedObject.field1).toBe("***");
			expect(obfuscatedObject.field2).toBe("***");
			expect(obfuscatedObject.field3).toBe("non-sensitive");
			expect(obfuscatedObject.nested.field4).toBe("***");
			expect(obfuscatedObject.nested.field5).toBe("non-sensitive");
			expect(obfuscatedObject.nested.field6).toBeNull();
			expect(obfuscatedObject.nested.field7).toBeUndefined();
		});
	
		it("should handle arrays correctly", async () => {
			const inputObject = {
				field1: "sensitive1",
				arrayField: [
					{
						field2: "sensitive2",
						field3: "non-sensitive",
					},
					{
						field2: "sensitive3",
						field3: "non-sensitive",
					},
				],
			};
	
			const txmaFieldsToShow = ["field3"];
	
			const obfuscatedObject = await f2fService.obfuscateJSONValues(inputObject, txmaFieldsToShow);
	
			// Check that sensitive fields are obfuscated and non-sensitive fields are not
			expect(obfuscatedObject.field1).toBe("***");
			expect(obfuscatedObject.arrayField[0].field2).toBe("***");
			expect(obfuscatedObject.arrayField[0].field3).toBe("non-sensitive");
			expect(obfuscatedObject.arrayField[1].field2).toBe("***");
			expect(obfuscatedObject.arrayField[1].field3).toBe("non-sensitive");
		});
	
		it("should obfuscate values of different types", async () => {
			const inputObject = {
				stringField: "sensitive-string",
				numberField: 42,
				booleanField: true,
			};
	
			const txmaFieldsToShow: string[] | undefined = [];
	
			const obfuscatedObject = await f2fService.obfuscateJSONValues(inputObject, txmaFieldsToShow);
	
			// Check that all fields are obfuscated
			expect(obfuscatedObject.stringField).toBe("***");
			expect(obfuscatedObject.numberField).toBe("***");
			expect(obfuscatedObject.booleanField).toBe("***");
		});
	
		it('should return "***" for non-object input', async () => {
			const input = "string-input";
	
			const obfuscatedValue = await f2fService.obfuscateJSONValues(input);
	
			// Check that non-object input is obfuscated as '***'
			expect(obfuscatedValue).toBe("***");
		});
	});

	describe("#sendToTXMA", () => {
		it("Should send event to TxMA without encodedHeader if encodedHeader param is missing", async () => {  
			const payload = txmaEventPayload;
			await f2fService.sendToTXMA(payload);
	
			const messageBody = JSON.stringify(payload);			
	
			expect(SendMessageCommand).toHaveBeenCalledWith({
				MessageBody: messageBody,
				QueueUrl: "MYQUEUE",
			});
			expect(mockSqsClient.send).toHaveBeenCalled();
			expect(f2fService.logger.info).toHaveBeenCalledWith("Sent message to TxMA");
		});

		it("Should send event to TxMA without encodedHeader if encodedHeader param is empty", async () => {  
			const payload = txmaEventPayload;
			await f2fService.sendToTXMA(payload, "");
	
			const messageBody = JSON.stringify(payload);			
	
			expect(SendMessageCommand).toHaveBeenCalledWith({
				MessageBody: messageBody,
				QueueUrl: "MYQUEUE",
			});
			expect(mockSqsClient.send).toHaveBeenCalled();
			expect(f2fService.logger.info).toHaveBeenCalledWith("Sent message to TxMA");
		});

		it("Should send event to TxMA with the correct details for a payload without restricted present", async () => {  
			await f2fService.sendToTXMA(txmaEventPayload, "ENCHEADER");
	
			const messageBody = JSON.stringify({
				...txmaEventPayload,
				restricted: {
					device_information: {
						encoded: "ENCHEADER",
					},
				},
			});
	
			expect(SendMessageCommand).toHaveBeenCalledWith({
				MessageBody: messageBody,
				QueueUrl: "MYQUEUE",
			});
			expect(mockSqsClient.send).toHaveBeenCalled();
			expect(f2fService.logger.info).toHaveBeenCalledWith("Sent message to TxMA");
		});

		it("Should send event to TxMA with the correct details for a payload with restricted present", async () => {  
				
			const restrictedDetails = {
				device_information: {
					encoded: "ENCHEADER",
				},
			};
	
			const payload = txmaEventPayload;
			payload.restricted = restrictedDetails;
	
			await f2fService.sendToTXMA(payload, "ENCHEADER");
			const messageBody = JSON.stringify(payload);
	
			expect(SendMessageCommand).toHaveBeenCalledWith({
				MessageBody: messageBody,
				QueueUrl: "MYQUEUE",
			});
			expect(mockSqsClient.send).toHaveBeenCalled();
			expect(f2fService.logger.info).toHaveBeenCalledWith("Sent message to TxMA");
		});		

		it("show throw error if failed to send to TXMA queue", async () => {
			mockSqsClient.send = jest.fn().mockRejectedValue({});

			await expect(f2fService.sendToTXMA(txmaEventPayload)).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
			}));
			expect(f2fService.logger.error).toHaveBeenCalledWith({
				message: "Error when sending message to TXMA Queue", error: expect.anything(),
			});
		});
	});
});
