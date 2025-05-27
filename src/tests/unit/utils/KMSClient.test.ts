import * as AWS from "@aws-sdk/client-kms";
import { mockKmsClient } from "../../../tests/contract/mocks/kmsClient";
import { createKmsClient } from "../../../utils/KMSClient";
import { Logger } from "@aws-lambda-powertools/logger";
import AWSXRay from "aws-xray-sdk-core";

jest.mock("aws-xray-sdk-core", () => ({
    captureAWSv3Client: jest.fn((client) => client),
    setContextMissingStrategy: jest.fn(),
}));

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

        const kmsClient = createKmsClient();

        expect(kmsClient).toBe(mockKmsClient);
        expect(loggerSpy).toHaveBeenCalledWith("KMSClient: USING MOCKED");
    });

    it("should return a real KMS client when USE_MOCKED is not true or undefined", () => {
        process.env.USE_MOCKED = undefined;
        process.env.REGION = "eu-west-2";
        process.env.XRAY_ENABLED = "false";

        const kmsClient = createKmsClient();
        expect(kmsClient).toBeInstanceOf(AWS.KMS);
    });

    it("should return an X-Ray wrapped SQS client when XRAY_ENABLED is true and USE_MOCKED is not set", () => {
        process.env.XRAY_ENABLED = "true";
        process.env.REGION = "eu-west-2";
        createKmsClient();
        expect(AWSXRay.captureAWSv3Client).toHaveBeenCalledWith(expect.any(AWS.KMS));
    });

    it("should return a raw SSM client when XRAY_ENABLED is false and USE_MOCKED is not set", () => {
        process.env.XRAY_ENABLED = "false";
        process.env.REGION = "eu-west-2"; // Or your desired region
        const ssmClient = createKmsClient();
        expect(AWSXRay.captureAWSv3Client).not.toHaveBeenCalled();
        expect(ssmClient).toBeInstanceOf(AWS.KMS);
    });


    it("should return a raw SSM client when XRAY_ENABLED is not set and USE_MOCKED is not set", () => {
        process.env.REGION = "eu-west-2"; // Or your desired region
        const ssmClient = createKmsClient();
        expect(AWSXRay.captureAWSv3Client).not.toHaveBeenCalled();
        expect(ssmClient).toBeInstanceOf(AWS.KMS);
    });

});