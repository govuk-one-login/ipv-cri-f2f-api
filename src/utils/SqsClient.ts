import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import AWSXRay from "aws-xray-sdk-core";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

const sqsClientRaw = new SQSClient({
	region: process.env.REGION,
	maxAttempts: 2,
	requestHandler: new NodeHttpHandler({
		connectionTimeout: 29000,
		socketTimeout: 29000,
	}),
});

const sqsClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(sqsClientRaw as any) : sqsClientRaw;

export { sqsClient, SendMessageCommand };
