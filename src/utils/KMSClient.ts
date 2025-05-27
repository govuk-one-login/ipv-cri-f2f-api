import * as AWS from "@aws-sdk/client-kms";
import AWSXRay from "aws-xray-sdk-core";
import { mockKmsClient } from "../tests/contract/mocks/kmsClient";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "KMSClient",
});

const createKmsClient = () => {    

	let kmsClient: AWS.KMS;	

	if (process.env.USE_MOCKED === "true") {
		logger.info("KMSClient: USING MOCKED");
		kmsClient = mockKmsClient as unknown as AWS.KMS;
	} else {

		AWSXRay.setContextMissingStrategy("LOG_ERROR");
		const kms = new AWS.KMS({
			region: process.env.REGION,
		});

		kmsClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(kms as any) : kms;
	}
	return kmsClient;
};

export { createKmsClient };
