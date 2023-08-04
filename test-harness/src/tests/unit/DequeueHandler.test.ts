import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../DequeueHandler";
import { BatchItemFailure } from "../../utils/BatchItemFailure";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Logger } from "@aws-lambda-powertools/logger";

jest
  .useFakeTimers()
  .setSystemTime(new Date('2020-01-01'));

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn()
	})),
	PutObjectCommand: PutObjectCommand
}));

jest.mock("@aws-lambda-powertools/logger", () => ({
	Logger: jest.fn().mockImplementation(() => ({
		info: jest.fn(),
		error: jest.fn()
	})),
}));

const mockS3Client = new S3Client({});
const mockLogger = new Logger({});

describe("DequeueHandler", () => {
	// beforeEach(() => {
	// 	jest
	// 	.useFakeTimers()
	// 	.setSystemTime(new Date('2020-01-01'));
  // });

	// afterEach(() => {
  //   jest.useRealTimers();
  //   jest.resetAllMocks();
  // });

  const body1 = JSON.stringify({ event_name: "TEST_EVENT", sub: "test_SUB_1" });
  const body2 = JSON.stringify({ event_name: "TEST_EVENT", sub: "test_SUB_2" });
  const event = { Records: [{ messageId: '11111', body: body1 }, { messageId: '22222', body: body2 }] };

  beforeEach(() => {
    process.env.BUCKET_FOLDER_PREFIX = "ipv-core/";
    process.env.EVENT_TEST_BUCKET_NAME = "test-bucket";
    process.env.PROPERTY_NAME = "sub";
    mockS3Client.send.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  })

  it("Returns no batchItemFailures if all events were successfully sent to S3 where property name is sub", async () => {
    await expect(lambdaHandler(event)).resolves.toEqual({ batchItemFailures: [] });

    expect(mockLogger.info).toHaveBeenCalledWith("Starting to process records");
    expect(mockLogger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_1-2020-01-01T00:00:00.000Z-11111 to bucket test-bucket`);
    expect(mockLogger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_2-2020-01-01T00:00:00.000Z-22222 to bucket test-bucket`);
    expect(mockLogger.info).toHaveBeenCalledWith("Finished processing records");
    expect(mockS3Client.send).toHaveBeenCalledTimes(2);
  });

  it("Returns no batchItemFailures if all events were successfully sent to S3 where property name is user.session_id", async () => {
    process.env.PROPERTY_NAME = "user.session_id";
    const body1 = JSON.stringify({ event_name: "F2F_YOTI_START", user: { session_id: "test_user_id_1" } });
    const body2 = JSON.stringify({ event_name: "F2F_YOTI_START", user: { session_id: "test_user_id_2" } });
    const txmaEvent = { Records: [{ messageId: '11111', body: body1 }, { messageId: '22222', body: body2 }] };

    await expect(lambdaHandler(txmaEvent)).resolves.toEqual({ batchItemFailures: [] });

    expect(mockLogger.info).toHaveBeenCalledWith("Starting to process records");
    expect(mockLogger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_user_id_1-2020-01-01T00:00:00.000Z-11111 to bucket test-bucket`);
    expect(mockLogger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_user_id_2-2020-01-01T00:00:00.000Z-22222 to bucket test-bucket`);
    expect(mockLogger.info).toHaveBeenCalledWith("Finished processing records");
    expect(mockS3Client.send).toHaveBeenCalledTimes(2);
  });

  it("Returns batchItemFailures if events failed to send to S3", async () => {
    const error = new Error("Failed to send to S3");
    mockS3Client.send.mockImplementationOnce(() => { throw error });

    await expect(lambdaHandler(event)).resolves.toEqual({ batchItemFailures: [new BatchItemFailure("11111")] });

    expect(mockLogger.error).toHaveBeenCalledWith({ message: "Error writing keys to S3 bucket", error });
    expect(mockLogger.info).toHaveBeenCalledWith("Finished processing records");
    expect(mockS3Client.send).toHaveBeenCalledTimes(1);
  });
});
