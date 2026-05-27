import type { MockInstance } from "vitest";
import * as AWS from "@aws-sdk/client-sqs";
import { mockSqsClient } from "../../../tests/contract/mocks/sqsClient";
import { createSqsClient } from "../../../utils/SqsClient";
import { Logger } from "@aws-lambda-powertools/logger";
import { captureAWSv3Client } from "aws-xray-sdk-core";

vi.mock("aws-xray-sdk-core", () => ({
    captureAWSv3Client: vi.fn((client) => client),
    setContextMissingStrategy: vi.fn(),
}));

describe("createSqsClient", () => {
	
	let loggerSpy: MockInstance;

	beforeEach(() => {
		loggerSpy = vi.spyOn(Logger.prototype, 'info');
	});

    afterEach(() => {
		loggerSpy.mockRestore();
        vi.clearAllMocks();
    });

	it("should use the mocked client and log correctly when USE_MOCKED is true", () => {
        process.env.USE_MOCKED = "true";

        const sqsClient = createSqsClient();

        expect(sqsClient).toBe(mockSqsClient);
        expect(loggerSpy).toHaveBeenCalledWith("SqsClient: USING MOCKED");
    });

    it("should return a real SQS client when USE_MOCKED is not true or undefined", () => {
        process.env.USE_MOCKED = undefined;
        process.env.REGION = "eu-west-2";
        process.env.XRAY_ENABLED = "false";

        const sqsClient = createSqsClient();
        expect(sqsClient).toBeInstanceOf(AWS.SQSClient);
    });

    it("should return an X-Ray wrapped SQS client when XRAY_ENABLED is true and USE_MOCKED is not set", () => {
        process.env.XRAY_ENABLED = "true";
        process.env.REGION = "eu-west-2";
        createSqsClient();
        expect(captureAWSv3Client).toHaveBeenCalledWith(expect.any(AWS.SQSClient));
    });

    it("should return a raw SQS client when XRAY_ENABLED is false and USE_MOCKED is not set", () => {
        process.env.XRAY_ENABLED = "false";
        process.env.REGION = "eu-west-2"; // Or your desired region
        const sqsClient = createSqsClient();
        expect(captureAWSv3Client).not.toHaveBeenCalled();
        expect(sqsClient).toBeInstanceOf(AWS.SQSClient);
    });


    it("should return a raw SQS client when XRAY_ENABLED is not set and USE_MOCKED is not set", () => {
        process.env.REGION = "eu-west-2"; // Or your desired region
        const sqsClient = createSqsClient();
        expect(captureAWSv3Client).not.toHaveBeenCalled();
        expect(sqsClient).toBeInstanceOf(AWS.SQSClient);
    });

});
