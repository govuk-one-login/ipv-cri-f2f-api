/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable max-depth */
/* eslint-disable max-lines */
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { EmailResponse } from "../../../models/EmailResponse";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { mock } from "jest-mock-extended";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { SendToGovNotifyService } from "../../../services/SendToGovNotifyService";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fetchEncodedFileFromS3Bucket } from "../../../utils/S3Client";
import { PDFDocument } from "pdf-lib";

jest.mock("notifications-node-client", () => {
	return {
		NotifyClient: jest.fn(),
	};
});

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../../utils/S3Client", () => ({
	fetchEncodedFileFromS3Bucket: jest.fn(),
}));


let sendToGovNotifyServiceTest: SendToGovNotifyService;
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = mock<Logger>();
const mockF2fService = mock<F2fService>();
function getMockSessionItem(): ISessionItem {
	const session: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
		accessToken: "123456",
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
	return session;
}

function getMockPersonItem(userPdfPreference: string): PersonIdentityItem {
	console.log(`!!running get person, pdfpref = ${userPdfPreference}`);
	const personEmail: PersonIdentityItem = {
		addresses: [
			{
				addressCountry: "United Kingdom",
				buildingName: "Sherman",
				subBuildingName: "Flat 5",
				uprn: 123456789,
				streetName: "Wallaby Way",
				postalCode: "F1 1SH",
				buildingNumber: "32",
				addressLocality: "Sidney",
				preferredAddress: true,
			},
		],
		sessionId: "RandomF2FSessionID",
		emailAddress: "test123@gov.uk",
		birthDate: [
			{
				value: "1960-02-02",
			},
		],
		name: [
			{
				nameParts: [
					{
						type: "GivenName",
						value: "Frederick",
					},
					{
						type: "GivenName",
						value: "Joseph",
					},
					{
						type: "FamilyName",
						value: "Flintstone",
					},
				],
			},
		],
		pdfPreference: "EMAIL_ONLY",
		expiryDate: 1612345678,
		createdDate: 1612335678,
	};
	const personPost = {
		...personEmail,
		pdfPreference: "PRINTED_LETTER",
	};

	if (userPdfPreference === "PRINTED_LETTER") {
		return personPost;
	} else {
		return personEmail;
	}
}

const timestamp = 1689952318;
const mockSendEmail = jest.fn();
const mockSendPrecompiledLetter = jest.fn();

describe("SendToGovNotifyService", () => {
	beforeAll(() => {
		console.log("!!!");
		sendToGovNotifyServiceTest = SendToGovNotifyService.getInstance(logger, GOVUKNOTIFY_API_KEY, "serviceId");
		console.log("???");
		// @ts-ignore
		sendToGovNotifyServiceTest.f2fService = mockF2fService;

		NotifyClient.mockImplementation(() => {
			return {
				sendEmail: mockSendEmail,
				sendPrecompiledLetter: mockSendPrecompiledLetter,
			};
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.setSystemTime(new Date(timestamp * 1000));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("Returns EmailResponse when YOTI PDF email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "test", 201);
		const session = getMockSessionItem();
		const person = getMockPersonItem("EMAIL_ONLY");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
		mockSendEmail.mockResolvedValue(mockEmailResponse);
        
		const emailResponse = await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);
    
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
			event_name: TxmaEventNames.F2F_YOTI_PDF_EMAILED,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp,
			event_timestamp_ms: timestamp * 1000,
			extensions: {
				evidence: [
					{
						txn: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
					},
				],
			},
			user: {
				email: person.emailAddress,
				govuk_signin_journey_id: session.clientSessionId,
				ip_address: session.clientIpAddress,
				persistent_session_id: session.persistentSessionId,
				session_id: session.sessionId,
				user_id: session.subject,
			},
		});
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("SendToGovNotifyService fails and doesn't retry when GovNotify throws an error", async () => {
		mockSendEmail.mockRejectedValue( {
			"response": {
				"data": {
					"errors": [
						{
							"error": "BadRequestError",
							"message": "Can't send to this recipient using a team-only API key",
						},
					],
					"status_code": 400,
				},
    
			},
		});
		const session = getMockSessionItem();
		const person = getMockPersonItem("EMAIL_ONLY");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
        
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow();
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
	});
    
	it("SendEmailService retries when GovNotify throws a 500 error", async () => {
		jest.useRealTimers();
		const session = getMockSessionItem();
		const person = getMockPersonItem("EMAIL_ONLY");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
		mockSendEmail.mockRejectedValue({
			"response": {
				"data": {
					"errors": [
						{
							"error": "Exception",
							"message": "Internal server error",
						},
					],
					"status_code": 500,
				},
			},
		});
    
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow();
		expect(mockSendEmail).toHaveBeenCalledTimes(4);
	});
    
	it("SendEmailService retries when GovNotify throws a 429 error", async () => {
		jest.useRealTimers();
		const session = getMockSessionItem();
		const person = getMockPersonItem("EMAIL_ONLY");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
		mockSendEmail.mockRejectedValue({
			"response": {
				"data": {
					"errors": [
						{
							"error": "TooManyRequestsError",
							"message": "Exceeded send limits (LIMIT NUMBER) for today",
						},
					],
					"status_code": 429,
				},
			},
		});
    
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow();
		expect(mockSendEmail).toHaveBeenCalledTimes(4);
	});
    
	it("Returns EmailResponse when email is sent successfully and write to TxMA fails", async () => {
		const session = getMockSessionItem();
		const person = getMockPersonItem("EMAIL_ONLY");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
		mockF2fService.sendToTXMA.mockRejectedValue({});
    
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockSendEmail.mockResolvedValue(mockEmailResponse);
		
		const emailResponse = await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);
    
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

	it.only("sends letter", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "test", 201);
		const session = getMockSessionItem();
		const person = getMockPersonItem("PRINTED_LETTER");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);
		// const mockPdf = new Uint8Array([1, 2, 3]);
		// const mockResizedPdf = new Uint8Array([4, 5, 6]);
        jest.spyOn(SendToGovNotifyService.prototype, "resizePdf").mockResolvedValue(Buffer.from("mocked PDF data") as unknown as Uint8Array);
        //jest.spyOn(SendToGovNotifyService.prototype, "sendGovNotificationLetter")

        mockSendPrecompiledLetter.mockResolvedValue("success");
		mockSendEmail.mockResolvedValue(mockEmailResponse);
        
        (fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);

        
        /////////////
		const emailResponse = await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);
    
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
			event_name: TxmaEventNames.F2F_YOTI_PDF_EMAILED,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp,
			event_timestamp_ms: timestamp * 1000,
			extensions: {
				evidence: [
					{
						txn: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
					},
				],
			},
			user: {
				email: person.emailAddress,
				govuk_signin_journey_id: session.clientSessionId,
				ip_address: session.clientIpAddress,
				persistent_session_id: session.persistentSessionId,
				session_id: session.sessionId,
				user_id: session.subject,
			},
		});
		expect(emailResponse.emailFailureMessage).toBe("");
	});
});
