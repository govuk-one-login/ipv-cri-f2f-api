import { SFNClient } from "@aws-sdk/client-sfn";
import { fromEnv, fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createDynamoDbClient } from "./dynamo";

export type DynamoClient = ReturnType<typeof createDynamoDbClient>;

export type SessionKey = { sessionId: string };

export type ErrorBody = { message: string };

// In Lambda the credentials are always in the environment. Locally they usually come from an
// SSO/profile login, which only the default provider chain understands.
export const credentialsProvider = () =>
	process.env.AWS_LAMBDA_FUNCTION_NAME === undefined
		? fromNodeProviderChain()
		: fromEnv();

export const createStepFunctionsClient = (): SFNClient =>
	new SFNClient({
		region: process.env.REGION,
		credentials: credentialsProvider(),
	});
