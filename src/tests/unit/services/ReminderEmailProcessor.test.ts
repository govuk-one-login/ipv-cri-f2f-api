import { ReminderEmailProcessor } from "../../../services/ReminderEmailProcessor";
import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { AppError } from "../../../utils/AppError";

describe("ReminderEmailProcessor", () => {
	let personIdentityItem: PersonIdentityItem;
	
	let reminderEmailProcessor: ReminderEmailProcessor;
	const mockF2fService = mock<F2fService>();
	const mockLogger = mock<Logger>();
	const mockMetrics = mock<Metrics>();

	const F2FSessionsWithYotiSession = [
		{
			createdDate: 1703429155023,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a4e",
			reminderEmailSent: true,
			authSessionState: "F2F_SESSION_CREATED",
		},
		{
			createdDate: 1681905531361,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a48",
			authSessionState: "F2F_SESSION_CREATED",
		},
		{
			createdDate: 1703429155023,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a4h",
			authSessionState: "F2F_SESSION_CREATED",
		},
		{
			createdDate: 1703429155023,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a47",
			reminderEmailSent: false,
			authSessionState: "F2F_SESSION_CREATED",
		},
		{
			createdDate: 1681905531361,
			sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a43",
			authSessionState: "F2F_SESSION_CREATED",
		},
	];

	function getPersonIdentityItem(): PersonIdentityItem {
		const personIdentityItem: PersonIdentityItem = {
			"addresses": [
				{
					"addressCountry": "GB",
					"buildingName": "Sherman",
					"uprn": 123456789,
					"streetName": "Wallaby Way",
					"postalCode": "F1 1SH",
					"buildingNumber": "32",
					"addressLocality": "Sidney",
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
		};
		return personIdentityItem;
	}
	

	beforeAll(() => {
		reminderEmailProcessor = new ReminderEmailProcessor(mockLogger, mockMetrics);
		// @ts-ignore
		reminderEmailProcessor.f2fService = mockF2fService;

		personIdentityItem = getPersonIdentityItem();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("should process request successfully", async () => {
    
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
		mockF2fService.sendToGovNotify.mockResolvedValue();
		mockF2fService.updateReminderEmailFlag.mockResolvedValue();

		const result = await reminderEmailProcessor.processRequest();

		expect(result).toEqual({ statusCode: 200, body: "Success" });
		expect(mockLogger.info).toHaveBeenCalledWith("Total num. of users to send reminder emails to:", { numOfUsers: 2 });
		expect(mockF2fService.getSessionsByAuthSessionState).toHaveBeenCalledWith("F2F_SESSION_CREATED");
		expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(1, "b2ba545c-18a9-4b7e-8bc1-38a05b214a4h", "PERSONIDENTITYTABLE");
		expect(mockF2fService.getPersonIdentityById).toHaveBeenNthCalledWith(2, "b2ba545c-18a9-4b7e-8bc1-38a05b214a47", "PERSONIDENTITYTABLE");
		expect(mockF2fService.sendToGovNotify).toHaveBeenCalledWith({
			Message: {
				emailAddress: "testReminder@test.com",
				messageType: "REMINDER_EMAIL",
			},
		});
		expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a4h", true);
		expect(mockF2fService.updateReminderEmailFlag).toHaveBeenCalledWith("b2ba545c-18a9-4b7e-8bc1-38a05b214a47", true);
	});

	it("should log if no users with authSessionState F2F_SESSION_CREATED", async () => {
    
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue([]);

		const result = await reminderEmailProcessor.processRequest();

		expect(result).toEqual({ statusCode: 200, body: "No F2F_SESSION_CREATED Records" });
		expect(mockLogger.info).toHaveBeenCalledWith("No users with session state F2F_SESSION_CREATED");
	});

	it("should log if no users with authSessionState F2F_SESSION_CREATED have sessions older than 5 days", async () => {
    
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue([
			{
				createdDate: 1681905531361,
				sessionId: "b2ba545c-18a9-4b7e-8bc1-38a05b214a43",
				authSessionState: "F2F_SESSION_CREATED",
			},
		]);

		const result = await reminderEmailProcessor.processRequest();

		expect(result).toEqual({ statusCode: 200, body: "No F2F_SESSION_CREATED Sessons older than 5 days" });
		expect(mockLogger.info).toHaveBeenCalledWith("No users with session state F2F_SESSION_CREATED older than 5 days");
	});

	it("should handle error during processing", async () => {
		mockF2fService.getSessionsByAuthSessionState.mockRejectedValue(new Error("Error"));

		const result = await reminderEmailProcessor.processRequest();

		expect(result.statusCode).toBe(500);
	});

	it("should log an error if error fetching from Person Identity Table", async () => {
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockRejectedValueOnce("Error");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Error fetching record from Person Identity Table", { "error": "Error" });
	});

	it("should warn if no records are returned from person Identity Table", async () => {
    
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockResolvedValue(undefined);

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.warn).toHaveBeenNthCalledWith(1, "No records returned from Person Identity Table");
	});

	it("should log an error if not able to send to GovNotify", async () => {
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
		mockF2fService.sendToGovNotify.mockRejectedValueOnce("Unable to send to GovNotify");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send reminder email or update flag", { "error": "Unable to send to GovNotify" });
	});

	it("should log an error if not able to set the reminded flag", async () => {
		mockF2fService.getSessionsByAuthSessionState.mockResolvedValue(F2FSessionsWithYotiSession);
		mockF2fService.getPersonIdentityById.mockResolvedValue(personIdentityItem);
		mockF2fService.sendToGovNotify.mockResolvedValue();
		mockF2fService.updateReminderEmailFlag.mockRejectedValueOnce("Unable to set reminded flag");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Failed to send reminder email or update flag", { "error": "Unable to set reminded flag" });
	});

	it("should throw an error if not able to access session table", async () => {
		mockF2fService.getSessionsByAuthSessionState.mockRejectedValueOnce("Permission Denied");

		await reminderEmailProcessor.processRequest();

		expect(mockLogger.error).toHaveBeenCalledWith("Unexpected error accessing session table", { "error": "Permission Denied", "messageCode": "FAILED_FETHCING_SESSIONS" });
	});
});
