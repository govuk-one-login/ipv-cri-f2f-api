import { DynamoDBClient, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

export const createDynamoDbClient = (
	credentials: DynamoDBClientConfig["credentials"],
): DynamoDBDocument =>
	DynamoDBDocument.from(
		new DynamoDBClient({ region: process.env.AWS_REGION ?? process.env.REGION, credentials }),
		{
			marshallOptions: { convertEmptyValues: false, removeUndefinedValues: true },
			unmarshallOptions: { wrapNumbers: false },
		},
	);
