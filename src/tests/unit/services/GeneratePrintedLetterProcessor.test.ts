 
import { captor, mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { GeneratePrintedLetterProcessor } from "../../../services/GeneratePrintedLetterProcessor";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { S3Client } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import fs from "fs";
import { PDFService } from "../../../services/PdfService";

const mockF2fService = mock<F2fService>();
const mockPdfService = mock<PDFService>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
	GetObjectCommand: jest.fn().mockImplementation((args) => args),
}));

const mockS3Client = mock<S3Client>();

let generatePrintedLetterProcessor: GeneratePrintedLetterProcessor;
const sessionId = "RandomF2FSessionID";
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
		yotiSessionId: "1234",
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

describe("GenerateYotiLetterProcessor", () => {
	beforeAll(() => {
		generatePrintedLetterProcessor = new GeneratePrintedLetterProcessor(logger, metrics);
		// @ts-expect-error linting to be updated
		generatePrintedLetterProcessor.f2fService = mockF2fService;
		// @ts-expect-error linting to be updated
		generatePrintedLetterProcessor.s3Client = mockS3Client;
		// @ts-expect-error linting to be updated
		generatePrintedLetterProcessor.pdfService = mockPdfService;

		metrics.singleMetric.mockReturnValue(metrics);
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

	it("PDFs merged and uploaded to S3", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);

		mockPdfService.createPdf.mockResolvedValueOnce(await asyncIterableToBuffer(fileToAsyncIterable("tests/unit/resources/letter.pdf")));

		jest.spyOn(mockS3Client, "send").mockImplementation(() => {
			return {
				"Body": fileToAsyncIterable("tests/unit/resources/letter.pdf"),
			};
		});
		const response =  await generatePrintedLetterProcessor.processRequest({ sessionId, pdf_preference });

		const myCaptor = captor();

		expect(mockS3Client.send).toHaveBeenNthCalledWith(1, expect.objectContaining({
			Bucket: "YOTI_LETTER_BUCKET",
			Key: "pdf-1234",
		}));

		expect(mockS3Client.send).toHaveBeenNthCalledWith(2, expect.objectContaining({
			Bucket: "YOTI_LETTER_BUCKET",
			Key: "merged-pdf-1234",
			ContentType: "application/octet-stream",
			Body: myCaptor,
		}));
		
		const mergedPdf = myCaptor.value;

		fs.writeFileSync("tests/unit/resources/merged.pdf", mergedPdf);

		let mergedSize = 0;
		let originalSize = 0;
		try {
			const mergedStats = fs.statSync("tests/unit/resources/merged.pdf");
			const originalStats = fs.statSync("tests/unit/resources/letter.pdf");
			mergedSize = mergedStats.size / 1000;
			originalSize = originalStats.size / 1000;
		} catch (err) {
			console.log(err);
		}

		const tolerance = 0.1 * mergedSize; // Calculate 10% tolerance

		expect(mergedSize).toBeGreaterThanOrEqual(originalSize * 2 - tolerance);
		expect(mergedSize).toBeLessThanOrEqual(originalSize * 2 + tolerance);
		expect(response).toMatchObject({
			sessionId: "RandomF2FSessionID",
			pdf_preference: "post",
		});
	});

	it("When error retreving from S3 assert service throws error", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		jest.spyOn(mockS3Client, "send").mockImplementationOnce(() => {
			throw new Error("error");
		});
		await expect(generatePrintedLetterProcessor.processRequest({ sessionId, pdf_preference })).rejects.toThrow(expect.objectContaining({
			name: "Error",
			message: "Error retrieving Yoti PDF from S3 bucket",
		}));
		expect(metrics.addDimension).toHaveBeenCalledWith("error", "unable_to_retrieve_yoti_instructions");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GeneratePrintedLetter_error", MetricUnits.Count, 1);
	});

});

async function* fileToAsyncIterable(filePath: string): AsyncIterable<Uint8Array> {
	const bufferSize = 4096; // Define your desired buffer size here
	const fileHandle = await readFile(filePath);
  
	for (let i = 0; i < fileHandle.length; i += bufferSize) {
	  const chunk = fileHandle.slice(i, i + bufferSize);
	  yield chunk;
	}
}

async function asyncIterableToBuffer(iterable: AsyncIterable<Uint8Array>): Promise<Buffer> {
	const chunks = [];
	for await (const chunk of iterable) {
	  chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}
