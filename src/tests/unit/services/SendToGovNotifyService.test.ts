/* eslint-disable max-lines-per-function */
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
import { fetchEncodedFileFromS3Bucket } from "../../../utils/S3Client";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";

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
const metrics = mock<Metrics>();
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

function getMockPersonItem(communicationPreference: string): PersonIdentityItem {
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
				addressLocality: "Sydney",
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

	const personPostDifferentAddress = {
		...personPost,
		addresses: [
			...personPost.addresses,
			{
				addressCountry: "United Kingdom",
				buildingName: "Baker",
				subBuildingName: "Flat 12",
				uprn: 987654321,
				streetName: "Downing Street",
				postalCode: "SW1A 1AA",
				buildingNumber: "10",
				addressLocality: "London",
				preferredAddress: false,
			},
		],
	};

	if (communicationPreference === "letter") {
		return personPost;
	} else if (communicationPreference === "letterDifferentAddress") {
		return personPostDifferentAddress;
	} else {
		return personEmail;
	}
}

const timestamp = 1689952318;
const mockSendEmail = jest.fn();
const mockSendPrecompiledLetter = jest.fn();

describe("SendToGovNotifyService", () => {
	beforeAll(() => {
		sendToGovNotifyServiceTest = SendToGovNotifyService.getInstance(logger, metrics, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-ignore
		sendToGovNotifyServiceTest.f2fService = mockF2fService;

		NotifyClient.mockImplementation(() => {
			return {
				sendEmail: mockSendEmail,
				sendPrecompiledLetter: mockSendPrecompiledLetter,
			};
		});
		metrics.singleMetric.mockReturnValue(metrics);
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
		const mockEmailResponse = { status: 201, data: new EmailResponse(new Date().toISOString(), "test", 201, "1008") };
		const session = getMockSessionItem();
	
		const person = getMockPersonItem("email");
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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "SendToGovNotify_email_sent_successfully", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "201");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SendToGovNotify_notify_email_response", MetricUnits.Count, 1);

	});

	it("SendToGovNotifyService fails and doesn't retry when GovNotify throws a 400 error", async () => {
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
		const person = getMockPersonItem("email");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);

		
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow("sendYotiInstructions - Cannot send Email");
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenNthCalledWith(1, "status_code", "400");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "SendToGovNotify_notify_email_response", MetricUnits.Count, 1);
	});
    
	it("SendToGovNotifyService retries when GovNotify throws a 500 error", async () => {
		jest.useRealTimers();
		const session = getMockSessionItem();
		const person = getMockPersonItem("email");
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
        
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow("sendYotiInstructions - Cannot send Email");
		expect(mockSendEmail).toHaveBeenCalledTimes(4);
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "500");
		expect(metrics.addMetric).toHaveBeenCalledWith("SendToGovNotify_notify_email_response", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(6, "SendToGovNotify_email_sent_failed_all_attempts", MetricUnits.Count, 1);

	});
    
	it("SendToGovNotifyService retries when GovNotify throws a 429 error", async () => {
		jest.useRealTimers();
		const session = getMockSessionItem();
		const person = getMockPersonItem("email");
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
    
		await expect(sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId)).rejects.toThrow("sendYotiInstructions - Cannot send Email");
		expect(mockSendEmail).toHaveBeenCalledTimes(4);
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "429");
		expect(metrics.addMetric).toHaveBeenCalledWith("SendToGovNotify_notify_email_response", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(6, "SendToGovNotify_email_sent_failed_all_attempts", MetricUnits.Count, 1);

	});
    
	it("Returns EmailResponse when email is sent successfully and write to TxMA fails", async () => {
		const session = getMockSessionItem();
		const person = getMockPersonItem("email");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValueOnce(encoded);
		mockF2fService.sendToTXMA.mockRejectedValue({});
    
		const mockEmailResponse = { status: 201, data: new EmailResponse(new Date().toISOString(), "", 201, "1009") };

		mockSendEmail.mockResolvedValue(mockEmailResponse);
		
		const emailResponse = await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);
    
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
		expect(emailResponse?.emailFailureMessage).toBe("");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "SendToGovNotify_email_sent_successfully", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "201");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SendToGovNotify_notify_email_response", MetricUnits.Count, 1);


	});

	it("Returns EmailResponse when posted customer letter & YOTI PDF email is sent successfully", async () => {
		const mockEmailResponse = { status: 201, data: new EmailResponse(new Date().toISOString(), "test", 201, "1010") };

		const session = getMockSessionItem();
		const person = getMockPersonItem("letter");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);
		

		mockSendPrecompiledLetter.mockResolvedValue(mockEmailResponse);
		mockSendEmail.mockResolvedValue(mockEmailResponse);
        
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);

    	const emailResponse = await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);
    
		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(2);
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(2, {
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
		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {
			event_name: TxmaEventNames.F2F_YOTI_PDF_LETTER_POSTED,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp,
			event_timestamp_ms: timestamp * 1000,
			extensions: {
				differentPostalAddress: false,
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
			restricted: {
				postalAddress: [
					{
						addressCountry: person.addresses[0].addressCountry,
						addressLocality: person.addresses[0].addressLocality,
						buildingName: person.addresses[0].buildingName,
						buildingNumber: person.addresses[0].buildingNumber,
						postalCode: person.addresses[0].postalCode,
						preferredAddress: person.addresses[0].preferredAddress,
						streetName: person.addresses[0].streetName,
						subBuildingName: person.addresses[0].subBuildingName,
						uprn: person.addresses[0].uprn,
					},
				],
			},
		});
		expect(emailResponse.emailFailureMessage).toBe("");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_opted_for_printed_letter", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "SendToGovNotify_fetched_merged_pdf", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SendToGovNotify_notify_letter_response", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "201");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(4, "SendToGovNotify_letter_sent_successfully", MetricUnits.Count, 1);

		expect(metrics.addMetric).toHaveBeenNthCalledWith(5, "SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenNthCalledWith(2, "status_code", "201");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(6, "SendToGovNotify_email_sent_successfully", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(7, "SendToGovNotify_notify_email_response", MetricUnits.Count, 1);


	});

	it("send F2F_YOTI_PDF_LETTER_POSTED TxMA event with differentPostalAddress set to true if the user has selected a different postal address", async () => {
		const mockEmailResponse = { status: 201, data: new EmailResponse(new Date().toISOString(), "test", 201, "1020") };
		const session = getMockSessionItem();
		const person = getMockPersonItem("letterDifferentAddress");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);
		mockSendPrecompiledLetter.mockResolvedValue({ id: 1, message: "success", status: 201 });
		mockSendEmail.mockResolvedValue(mockEmailResponse);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);

		await sendToGovNotifyServiceTest.sendYotiInstructions(session.sessionId);

		expect(mockF2fService.sendToTXMA).toHaveBeenNthCalledWith(1, {
			event_name: TxmaEventNames.F2F_YOTI_PDF_LETTER_POSTED,
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp,
			event_timestamp_ms: timestamp * 1000,
			extensions: {
				differentPostalAddress: true,
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
			restricted: {
				postalAddress: [
					{
						addressCountry: person.addresses[0].addressCountry,
						addressLocality: person.addresses[0].addressLocality,
						buildingName: person.addresses[0].buildingName,
						buildingNumber: person.addresses[0].buildingNumber,
						postalCode: person.addresses[0].postalCode,
						preferredAddress: person.addresses[0].preferredAddress,
						streetName: person.addresses[0].streetName,
						subBuildingName: person.addresses[0].subBuildingName,
						uprn: person.addresses[0].uprn,
					},
				],
			},
		});
	});

	it("Returns EmailResponse when posted customer letter fails but YOTI PDF email is sent successfully", async () => {
		const session = getMockSessionItem();
		const person = getMockPersonItem("letter");
		const encoded = "gwegwtb";
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.getPersonIdentityById.mockResolvedValue(person);
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);
		

		mockSendPrecompiledLetter.mockResolvedValue("success");
		mockSendPrecompiledLetter.mockRejectedValue( {
			"response": {
				"data": {
					"errors": [
						{
							"error": "BadRequestError",
							"message": "Can't send letters with a team-only API key",
						},
					],
					"status_code": 400,
				},
    
			},
		});
        
		(fetchEncodedFileFromS3Bucket as jest.Mock).mockResolvedValue(encoded);

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
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_opted_for_printed_letter", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "SendToGovNotify_fetched_merged_pdf", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenNthCalledWith(1, "status_code", "400");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(3, "SendToGovNotify_notify_letter_response", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(4, "SendToGovNotify_notify_letter_failed_generic_error", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(5, "SendToGovNotify_pdf_instructions_retreived", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(6, "SendToGovNotify_email_sent_successfully", MetricUnits.Count, 1);
		expect(metrics.addDimension).toHaveBeenNthCalledWith(2, "status_code", "201");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(7, "SendToGovNotify_notify_email_response", MetricUnits.Count, 1);


	});
});
