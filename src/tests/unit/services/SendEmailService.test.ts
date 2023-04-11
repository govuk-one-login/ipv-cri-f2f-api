import { Logger } from "@aws-lambda-powertools/logger";
import { SQSEvent } from "aws-lambda";
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { VALID_SQS_EVENT } from "../data/sqs-events";
import { SendEmailProcessor } from "../../../services/SendEmailProcessor";
import { SendEmailService } from "../../../services/SendEmailService";
import { mock } from "jest-mock-extended";
import { EmailResponse } from "../../../models/EmailResponse";
import { Email } from "../../../models/Email";
import { AppError } from "../../../utils/AppError";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiService } from "../../../services/YotiService";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { Response } from "../../../utils/Response";
import { VALID_AUTHCODE } from "../data/auth-events";
import { F2fResponse } from "../../../utils/F2fResponse";

const mockGovNotify = mock<NotifyClient>();
const mockYotiService = mock<YotiService>();
let sendEmailServiceTest: SendEmailService;
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "sdfsdf";
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = mock<Logger>();
let sqsEvent: SQSEvent;
const mockF2fService = mock<F2fService>();
function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
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
		authSessionState: AuthSessionState.F2F_DATA_RECEIVED,
	};
	return sess;
}
describe("SendEmailProcessor", () => {
	beforeAll(() => {
		sendEmailServiceTest = SendEmailService.getInstance(logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY);
		// @ts-ignore
		sendEmailServiceTest.govNotify = mockGovNotify;
		// @ts-ignore
		sendEmailServiceTest.yotiService = mockYotiService;
		// @ts-ignore
		sendEmailServiceTest.f2fService = mockF2fService;
		sqsEvent = VALID_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	it("Returns EmailResponse when email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("SendEmailService fails when GovNotify throws an error", async () => {
		mockGovNotify.sendEmail.mockImplementation(() => {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Using team-only API key");
		});
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		await expect(sendEmailServiceTest.sendEmail(email)).rejects.toThrow();
	});

	it("Write to txMA fails when session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(0);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ", undefined);
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("Returns EmailResponse when email is sent successfully and write to txMA fails", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
		expect(emailResponse.emailFailureMessage).toBe("");
	});

});
