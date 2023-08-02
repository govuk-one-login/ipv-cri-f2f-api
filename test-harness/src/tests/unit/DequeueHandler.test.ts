import { lambdaHandler, logger, s3Client } from "../../DequeueHandler";
import { BatchItemFailure } from "../../utils/BatchItemFailure";

jest
  .useFakeTimers()
  .setSystemTime(new Date('2020-01-01'));

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@aws-lambda-powertools/logger", () => ({
	Logger: jest.fn().mockImplementation(() => ({
		info: jest.fn(),
		error: jest.fn(),
	})),
}));

process.env.BUCKET_FOLDER_PREFIX = "ipv-core/"
process.env.EVENT_TEST_BUCKET_NAME = "test-bucket";

describe("DequeueHandler", () => {
  const body1 = JSON.stringify({
    event_name: "TEST_EVENT",
    sub: "test_SUB_1",
  });
  const body2 = JSON.stringify({
    event_name: "TEST_EVENT",
    sub: "test_SUB_2",
  });
  const event = {
    Records: [
      { messageId: '11111', body: body1 },
      { messageId: '22222', body: body2 },
    ],
  };

  it("Returns no batchItemFailures if all events were successfully sent to S3", async () => {
    jest.spyOn(s3Client, 'send').mockReturnValueOnce();

    const result = await lambdaHandler(event);
    expect(logger.info).toHaveBeenCalledWith("Starting to process records");
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_1-1577836800-11111 to bucket test-bucket`);
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_2-1577836800-22222 to bucket test-bucket`);
    expect(logger.info).toHaveBeenCalledWith("Finished processing records");
    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("Returns batchItemFailures if events failed to send to S3", async () => {
    const error = new Error("Failed to send to S3")
    jest.spyOn(s3Client, 'send').mockImplementationOnce(() => { throw error });

    const result = await lambdaHandler(event);
    expect(logger.error).toHaveBeenCalledWith({ message: "Error writing keys to S3 bucket", error })
    expect(logger.info).toHaveBeenCalledWith("Finished processing records");
    expect(result).toEqual({ batchItemFailures: [new BatchItemFailure("11111")] });
  });
});
