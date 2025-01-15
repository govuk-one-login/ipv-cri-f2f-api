/* eslint-disable @typescript-eslint/unbound-method */
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { GeneratePrintedLetterProcessor } from "../../../services/GeneratePrintedLetterProcessor";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { S3Client } from "@aws-sdk/client-s3";

const mockF2fService = mock<F2fService>();
const logger = mock<Logger>();
jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
	GetObjectCommand: jest.fn().mockImplementation((args) => args),
}));

const mockS3Client = mock<S3Client>();

let generatePrintedLetterProcessor: GeneratePrintedLetterProcessor;
const metrics = new Metrics({ namespace: "F2F" });
const sessionId = "RandomF2FSessionID";
const yotiPrivateKey = "privateKey";
const pdf_preference = "post";

function getMockSessionItem(): ISessionItem {
	const sessionInfo: ISessionItem = {
		sessionId: "RandomF2FSessionID",
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
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

describe("GenerateYotiLetterProcessor", () => {
	beforeAll(() => {
		generatePrintedLetterProcessor = new GeneratePrintedLetterProcessor(logger, metrics );
		// @ts-ignore
		generateYotiLetterProcessor.f2fService = mockF2fService;
		// @ts-ignore
		generateYotiLetterProcessor.s3Client = mockS3Client;

	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(generatePrintedLetterProcessor.processRequest({ sessionId, pdf_preference })).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION table",
		}));

		expect(logger.error).toHaveBeenCalledWith("Missing details in SESSION table", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("S3 success case", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		const response =  await generatePrintedLetterProcessor.processRequest({ sessionId, pdf_preference });
        
		// @ts-ignore
		expect(mockS3Client.send).toHaveBeenCalledWith({
			Bucket: "YOTI_LETTER_BUCKET",
			Key: "pdf-undefined",
			Body: "test-data",
			ContentType: "application/octet-stream",
		});

		expect(response).toMatchObject({
			sessionId: "RandomF2FSessionID",
			pdf_preference: "post",
		});
	});

	it("S3 fail case", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		jest.spyOn(mockS3Client, "send").mockImplementationOnce(() => {
			throw new Error("error");
		});
		await expect(generatePrintedLetterProcessor.processRequest({ sessionId, pdf_preference })).rejects.toThrow(expect.objectContaining({
			name: "Error",
			message: "Error uploading Yoti PDF to S3 bucket",
		}));
	});

});
