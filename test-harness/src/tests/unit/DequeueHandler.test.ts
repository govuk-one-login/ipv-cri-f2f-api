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

  beforeEach(() => {
    process.env.BUCKET_FOLDER_PREFIX = "ipv-core/";
    process.env.EVENT_TEST_BUCKET_NAME = "test-bucket";
    process.env.PROPERTY_NAME = "sub";
  })

  it("Returns no batchItemFailures if all events were successfully sent to S3 where property name is sub", async () => {
    jest.spyOn(s3Client, 'send').mockReturnValueOnce();

    const result = await lambdaHandler(event);
    expect(logger.info).toHaveBeenCalledWith("Starting to process records");
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_1-2020-01-01T00:00:00.000Z-11111 to bucket test-bucket`);
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_SUB_2-2020-01-01T00:00:00.000Z-22222 to bucket test-bucket`);
    expect(logger.info).toHaveBeenCalledWith("Finished processing records");
    expect(result).toEqual({ batchItemFailures: [] });
  });

  it("Returns no batchItemFailures if all events were successfully sent to S3 where property name is user.session_id", async () => {
    process.env.PROPERTY_NAME = "user.session_id";
    const body1 = JSON.stringify({
      event_name: "F2F_YOTI_START",
      user: {
        session_id: "test_user_id_1"
      }
    });
    const body2 = JSON.stringify({
      event_name: "F2F_YOTI_START",
      user: {
        session_id: "test_user_id_2"
      }
    });
    const txmaEvent = {
      Records: [
        { messageId: '11111', body: body1 },
        { messageId: '22222', body: body2 },
      ],
    };
    
    jest.spyOn(s3Client, 'send').mockReturnValueOnce();

    const result = await lambdaHandler(txmaEvent);
    expect(logger.info).toHaveBeenCalledWith("Starting to process records");
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_user_id_1-2020-01-01T00:00:00.000Z-11111 to bucket test-bucket`);
    expect(logger.info).toHaveBeenCalledWith(`Uploading object with key ipv-core/test_user_id_2-2020-01-01T00:00:00.000Z-22222 to bucket test-bucket`);
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
