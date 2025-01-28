import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import AWSXRay from "aws-xray-sdk-core";
import { mockSqsClient } from "../tests/contract/mocks/sqsClient";
import { Logger } from "@aws-lambda-powertools/logger";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "SqsClient",
});

const createSqsClient = () => {
	let sqsClient: SQSClient;
	if (process.env.USE_MOCKED) {
		logger.info("SqsClient: USING MOCKED");
		sqsClient = mockSqsClient as unknown as SQSClient;
	} else {

		AWSXRay.setContextMissingStrategy("LOG_ERROR");

		const sqsClientRaw = new SQSClient({
			region: process.env.REGION,
			maxAttempts: 2,
			requestHandler: new NodeHttpHandler({
				connectionTimeout: 29000,
				socketTimeout: 29000,
			}),
		});
		sqsClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(sqsClientRaw as any) : sqsClientRaw;

	}
	return sqsClient;
};

export { createSqsClient, SendMessageCommand };
