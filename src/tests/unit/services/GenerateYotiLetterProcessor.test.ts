/* eslint-disable @typescript-eslint/unbound-method */
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { GenerateYotiLetterProcessor } from "../../../services/GenerateYotiLetterProcessor";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiService } from "../../../services/YotiService";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { S3Client } from "@aws-sdk/client-s3";

const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
}));

const mockS3Client = mock<S3Client>();

let generateYotiLetterProcessor: GenerateYotiLetterProcessor;
const sessionId = "RandomF2FSessionID";
const yotiPrivateKey = "privateKey";
const pdfPreference = "post";

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
		generateYotiLetterProcessor = new GenerateYotiLetterProcessor(logger, metrics, yotiPrivateKey );
		// @ts-expect-error linting to be updated
		generateYotiLetterProcessor.f2fService = mockF2fService;
		YotiService.getInstance = jest.fn(() => mockYotiService);
		// @ts-expect-error linting to be updated
		generateYotiLetterProcessor.s3Client = mockS3Client;

	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(generateYotiLetterProcessor.processRequest({ sessionId, pdfPreference })).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION table",
		}));

		expect(logger.error).toHaveBeenCalledWith("Missing details in SESSION table", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("throws error if Yoti pdf generation fails", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce(undefined);

		await expect(generateYotiLetterProcessor.processRequest({ sessionId, pdfPreference })).rejects.toThrow(expect.objectContaining({
			name: "Error",
			message: "An error occurred when generating Yoti instructions pdf",
		}));

		expect(logger.error).toHaveBeenCalledWith("An error occurred when generating Yoti instructions pdf", {
			messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS,
		});
	});

	it("S3 success case", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce("test-data");
		const response =  await generateYotiLetterProcessor.processRequest({ sessionId, pdfPreference });
        
		expect(mockS3Client.send).toHaveBeenCalledWith({
			Bucket: "YOTI_LETTER_BUCKET",
			Key: "pdf-undefined",
			Body: "test-data",
			ContentType: "application/octet-stream",
		});

		expect(response).toMatchObject({
			sessionId: "RandomF2FSessionID",
			pdfPreference: "post",
		});
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GenerateYotiLetter_instructions_saved", MetricUnits.Count, 1);

	});

	it("S3 fail case", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce("test-data");
		jest.spyOn(mockS3Client, "send").mockImplementationOnce(() => {
			throw new Error("error");
		});
		await expect(generateYotiLetterProcessor.processRequest({ sessionId, pdfPreference })).rejects.toThrow(expect.objectContaining({
			name: "Error",
			message: "Error uploading Yoti PDF to S3 bucket",
		}));
	});

});
