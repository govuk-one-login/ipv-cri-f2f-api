import * as AWS from "@aws-sdk/client-kms";
import { mockKmsClient } from "../../../tests/contract/mocks/kmsClient";
import { createKmsClient } from "../../../utils/KMSClient";
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

});

