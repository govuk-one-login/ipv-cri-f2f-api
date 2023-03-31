import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";
import AWSXRay from "aws-xray-sdk-core";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

const awsRegion = process.env.AWS_REGION;
export const createDynamoDbClient = () => {
	const marshallOptions = {
		// Whether to automatically convert empty strings, blobs, and sets to `null`.
		convertEmptyValues: false,
		// Whether to remove undefined values while marshalling.
		removeUndefinedValues: true,
		// Whether to convert typeof object to map attribute.
		convertClassInstanceToMap: true,
	};
	const unmarshallOptions = {
		// Whether to return numbers as a string instead of converting them to native JavaScript numbers.
		wrapNumbers: false,
	};
	const translateConfig = { marshallOptions, unmarshallOptions };
	const dbClient = new DynamoDBClient({ region: awsRegion, credentials: fromEnv() });
	const dbClientRaw = DynamoDBDocument.from(dbClient, translateConfig);
	return process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(dbClientRaw as any) : dbClientRaw;
};
