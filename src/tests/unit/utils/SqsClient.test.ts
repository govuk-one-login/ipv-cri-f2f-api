import * as AWS from "@aws-sdk/client-sqs";
import { mockSqsClient } from "../../../tests/contract/mocks/sqsClient";
import { createSqsClient } from "../../../utils/SqsClient";
import { Logger } from "@aws-lambda-powertools/logger";

describe("createKmsClient", () => {
	
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(Logger.prototype, 'info');
	});

    afterEach(() => {
		loggerSpy.mockRestore();
        jest.clearAllMocks();
    });

	it("should use the mocked client and log correctly when USE_MOCKED is true", () => {
        process.env.USE_MOCKED = "true";

        const sqsClient = createSqsClient();

        expect(sqsClient).toBe(mockSqsClient);
        expect(loggerSpy).toHaveBeenCalledWith("KMSClient: USING MOCKED");
    });

    it("should return a real KMS client when USE_MOCKED is not true or undefined", () => {
        process.env.USE_MOCKED = undefined;
        process.env.REGION = "eu-west-2";
        process.env.XRAY_ENABLED = "false";

        const sqsClient = createSqsClient();
        expect(sqsClient).toBeInstanceOf(AWS.SQS);
    });

});

