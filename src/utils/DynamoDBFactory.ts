import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import AWSXRay from "aws-xray-sdk-core";
import { env } from "process";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

const awsRegion = process.env.AWS_REGION;
export const createDynamoDbClient = () => {
	const marshallOptions = {
		convertEmptyValues: false,
		removeUndefinedValues: true,
		convertClassInstanceToMap: true,
	};
	const unmarshallOptions = {
		wrapNumbers: false,
	};
	const translateConfig = { marshallOptions, unmarshallOptions };

	const isLocal = process.env.USE_MOCKED === "true";
	const endpoint = isLocal ? "http://localhost:8000" : undefined;

	const dbClient = new DynamoDBClient({
		region: awsRegion,
		credentials:fromEnv(),
		endpoint, // Add the local endpoint if running locally
	});

	const dbClientRaw = DynamoDBDocument.from(dbClient, translateConfig);
	return process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(dbClientRaw as any) : dbClientRaw;
};
