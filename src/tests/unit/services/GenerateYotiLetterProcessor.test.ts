import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { GenerateYotiLetterProcessor } from "../../../services/GenerateYotiLetterProcessor";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiService } from "../../../services/YotiService";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";


const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();
const logger = mock<Logger>();
const mockS3Client = {
	send: jest.fn(),
};

let generateYotiLetterProcessor: GenerateYotiLetterProcessor;
const metrics = new Metrics({ namespace: "F2F" });
const sessionId = "RandomF2FSessionID";
const yotiPrivateKey = "privateKey";

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
    		// @ts-ignore
		generateYotiLetterProcessor.f2fService = mockF2fService;
		YotiService.getInstance = jest.fn(() => mockYotiService);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(generateYotiLetterProcessor.processRequest(sessionId)).rejects.toThrow(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			message: "Missing details in SESSION table",
		}));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Missing details in SESSION table", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("throws error if Yoti pdf generation fails", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce(undefined);

		await expect(generateYotiLetterProcessor.processRequest(sessionId)).rejects.toThrow(expect.objectContaining({
			name: "Error",
			message: "An error occurred when generating Yoti instructions pdf",
		}));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("An error occurred when generating Yoti instructions pdf", {
			messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS,
		});
	});

	it("should upload object to S3 bucket", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		mockYotiService.fetchInstructionsPdf.mockResolvedValueOnce("200");

		const uploadParams = {
		  Bucket: "mockBucket",
		  Key: "mockKey",
		  Body: "mockEncodedBody",
		  ContentType: "application/octet-stream",
		};
	  
		mockS3Client.send.mockResolvedValueOnce("success");
	  
		await expect(generateYotiLetterProcessor.processRequest(sessionId));
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockS3Client.send).toHaveBeenCalledWith, (uploadParams);
	  });
});
