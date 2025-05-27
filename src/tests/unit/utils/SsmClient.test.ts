import * as AWS from "@aws-sdk/client-ssm";
import { mockSsmClient } from "../../contract/mocks/ssmClient";
import { createSsmClient } from "../../../utils/SSMClient";
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

        const ssmClient = createSsmClient();

        expect(ssmClient).toBe(mockSsmClient);
        expect(loggerSpy).toHaveBeenCalledWith("SSMClient: USING MOCKED");
    });

    it("should return a real SSM client when USE_MOCKED is not true or undefined", () => {
        process.env.USE_MOCKED = undefined;
        process.env.REGION = "eu-west-2";
        process.env.XRAY_ENABLED = "false";

        const ssmClient = createSsmClient();
        expect(ssmClient).toBeInstanceOf(AWS.SSMClient);
    });

});

