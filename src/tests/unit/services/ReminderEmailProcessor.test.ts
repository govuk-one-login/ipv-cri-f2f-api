/* eslint-disable @typescript-eslint/unbound-method */
import { ReminderEmailProcessor } from "../../../services/ReminderEmailProcessor";
import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";

describe("ReminderEmailProcessor", () => {
	let mockSessionItem: ISessionItem;
	let personIdentityItem: PersonIdentityItem;
	let reminderEmailProcessor: ReminderEmailProcessor;
	const mockF2fService = mock<F2fService>();
	const mockLogger = mock<Logger>();
	const mockMetrics = mock<Metrics>();

	const F2FSessionsWithYotiSession = [
		{
			createdDate: 1686327580350,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a4e",
			reminderEmailSent: true,
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1177408,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a48",
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1695302248,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a4h",
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1091008,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a47",
			reminderEmailSent: false,
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1695284750,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a43",
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
	];

	const F2FSessionsWithYotiSessionWithDocumentInfo = [
		{
			createdDate: 1686327580350,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a4e",
			reminderEmailSent: true,
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			documentUsed: "PASSPORT",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1177408,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a48",
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			documentUsed: "NATIONAL_ID",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1091008,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a47",
			reminderEmailSent: false,
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			documentUsed: "DRIVING_LICENCE",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
		{
			createdDate: 1695284750,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a43",
			authSessionState: "F2F_YOTI_SESSION_CREATED",
			documentUsed: "PASSPORT",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
		},
	];

	function getMockSessionItem(): ISessionItem {
		const sessionInfo: ISessionItem = {
			sessionId: "RandomF2FSessionID",
			yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
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
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
		};
		return sessionInfo;
	}

	const getPersonIdentityItem = (): PersonIdentityItem => ({
		"addresses": [
			{
				"addressCountry": "GB",
				"buildingName": "Sherman",
				"uprn": 123456789,
				"streetName": "Wallaby Way",
				"postalCode": "F1 1SH",
				"buildingNumber": "32",
				"addressLocality": "Sidney",
				"preferredAddress": true,
			},
		],
		"sessionId": "RandomF2FSessionID",
		"emailAddress": "testReminder@test.com",
		"birthDate": [
			{
				"value":"1960-02-02",
			},
		],
		"name": [
			{
				"nameParts": [
					{
						"type": "GivenName",
						"value": "Frederick",
					},
					{
						"type": "GivenName",
						"value": "Joseph",
					},
					{
						"type": "FamilyName",
						"value": "Flintstone",
					},
				],
			},
		],
		expiryDate: 1612345678,
		createdDate: 1612335678,
	});
	

	beforeAll(() => {
		reminderEmailProcessor = new ReminderEmailProcessor(mockLogger, mockMetrics);
		// @ts-ignore
		reminderEmailProcessor.f2fService = mockF2fService;

		mockSessionItem = getMockSessionItem();

		personIdentityItem = getPersonIdentityItem();
	});

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1695808788)); // Sep 27 2023 08:53:12 GMT+0000
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.resetAllMocks();
	});

	describe("Should process request successfully", () => {
		beforeEach(() => {
			mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSession);
			mockF2fService.getSessionById.mockResolvedValue(mockSessionItem);
			mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
			mockF2fService.sendToGovNotify.mockResolvedValue();
			mockF2fService.updateReminderEmailFlag.mockResolvedValue();
		});
	
		it("when documentUsed not present", async () => {
			const result = await reminderEmailProcessor.processRequest();
	
			expect(result).toEqual({ statusCode: 200, body: "Success" });
			expect(mockLogger.info).toHaveBeenCalledWith("Total num. of users to send reminder emails to:", { numOfUsers: 2 });
			expect(mockF2fService.getSessionsByAuthSessionStates).toHaveBeenCalledWith(["F2F_YOTI_SESSION_CREATED", "F2F_AUTH_CODE_ISSUED", "F2F_ACCESS_TOKEN_ISSUED"]);
			expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(1, "b2ba545c-18a9-4b7e-8bc1-38a05b214a48", "PERSONIDENTITYTABLE");
			expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(2, "b2ba545c-18a9-4b7e-8bc1-38a05b214a47", "PERSONIDENTITYTABLE");
			expect(mockF2fService.sendToGovNotify).toHaveBeenCalledWith({
				Message: {
					emailAddress: "testReminder@test.com",
					messageType: "REMINDER_EMAIL",
					sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a48",
					yotiSessionId: "6l9eerge43-475e-48c1-b2bf-df98e53501336",
				},
			});
			expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a48", true);
			expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a47", true);
		});
	
		it("when documentUsed present", async () => {
			mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSessionWithDocumentInfo);
	
			const result = await reminderEmailProcessor.processRequest();
	
			expect(result).toEqual({ statusCode: 200, body: "Success" });
			expect(mockLogger.info).toHaveBeenCalledWith("Total num. of users to send reminder emails to:", { numOfUsers: 2 });
			expect(mockF2fService.getSessionsByAuthSessionStates).toHaveBeenCalledWith(["F2F_YOTI_SESSION_CREATED", "F2F_AUTH_CODE_ISSUED", "F2F_ACCESS_TOKEN_ISSUED"]);
			expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(1, "b2ba545c-18a9-4b7e-8bc1-38a05b214a48", "PERSONIDENTITYTABLE");
			expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(2, "b2ba545c-18a9-4b7e-8bc1-38a05b214a47", "PERSONIDENTITYTABLE");
			expect(mockF2fService.sendToGovNotify).toHaveBeenNthCalledWith(1, { "Message": { "documentUsed": "NATIONAL_ID", "emailAddress": "testReminder@test.com", "firstName": "Frederick", "lastName": "Flintstone", "messageType": "REMINDER_EMAIL_DYNAMIC", "sessionId": "b2ba545c-18a9-4b7e-8bc1-38a05b214a48", "yotiSessionId": "6l9eerge43-475e-48c1-b2bf-df98e53501336" } });
			expect(mockF2fService.sendToGovNotify).toHaveBeenNthCalledWith(2, { "Message": { "documentUsed": "DRIVING_LICENCE", "emailAddress": "testReminder@test.com", "firstName": "Frederick", "lastName": "Flintstone", "messageType": "REMINDER_EMAIL_DYNAMIC", "sessionId": "b2ba545c-18a9-4b7e-8bc1-38a05b214a47", "yotiSessionId": "6l9eerge43-475e-48c1-b2bf-df98e53501336" } });
			expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a48", true);
			expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a47", true);
		});
	});

	it("should log if no users with authSessionState F2F_YOTI_SESSION_CREATED", async () => {
    
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue([]);

		const result = await reminderEmailProcessor.processRequest();

		expect(result).toEqual({ statusCode: 200, body: "No Session Records matching state" });
		expect(mockLogger.info).toHaveBeenCalledWith("No users with session states F2F_YOTI_SESSION_CREATED,F2F_AUTH_CODE_ISSUED,F2F_ACCESS_TOKEN_ISSUED");
	});

	it("should log if no users with authSessionState F2F_YOTI_SESSION_CREATED have sessions older than 5 days", async () => {
    
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue([
			{
				createdDate: 1681905531361,
				sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a43",
				authSessionState: "F2F_YOTI_SESSION_CREATED",
			},
		]);

		const result = await reminderEmailProcessor.processRequest();

		expect(result).toEqual({ statusCode: 200, body: "No Sessions older than 5 days" });
		expect(mockLogger.info).toHaveBeenCalledWith("No users with session states F2F_YOTI_SESSION_CREATED,F2F_AUTH_CODE_ISSUED,F2F_ACCESS_TOKEN_ISSUED older than 5 days");
	});

	it("should handle error during processing", async () => {
		mockF2fService.getSessionsByAuthSessionStates.mockRejectedValue(new Error("Error"));

		const result = await reminderEmailProcessor.processRequest();

		expect(result.statusCode).toBe(500);
	});

	it("should log an error if error fetching from Person Identity Table", async () => {
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockRejectedValueOnce("Error");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Error fetching record from Person Identity Table", { "error": "Error" });
	});

	it("should warn if no records are returned from person Identity Table", async () => {
    
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockResolvedValue(undefined);

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.warn).toHaveBeenNthCalledWith(1, "No records returned from Person Identity or Session Table");
	});

	it("should log an error if not able to send to GovNotify", async () => {
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getSessionById.mockResolvedValue(mockSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
		mockF2fService.sendToGovNotify.mockRejectedValueOnce("Unable to send to GovNotify");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send reminder email or update flag", { "error": "Unable to send to GovNotify" });
	});

	it("should log an error if not able to set the reminded flag", async () => {
		mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getSessionById.mockResolvedValue(mockSessionItem);
		mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
		mockF2fService.sendToGovNotify.mockResolvedValue();
		mockF2fService.updateReminderEmailFlag.mockRejectedValueOnce("Unable to set reminded flag");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send reminder email or update flag", { "error": "Unable to set reminded flag" });
	});

	it("should throw an error if not able to access session table", async () => {
		mockF2fService.getSessionsByAuthSessionStates.mockRejectedValueOnce("Permission Denied");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Unexpected error accessing session table", { "error": "Permission Denied", "messageCode": "FAILED_FETCHING_SESSIONS" });
	});
});
