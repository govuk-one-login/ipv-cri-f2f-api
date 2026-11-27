import { logger } from "@govuk-one-login/cri-logger";
import {
	DescribeExecutionCommand,
	SFNClient,
	StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { YotiCallbackTopics } from "../topics";
import { DynamoClient, ErrorBody, SessionKey } from "./common";

// Topics are triggered in this order.
const TOPICS_IN_ORDER: YotiCallbackTopics[] = [
	YotiCallbackTopics.FIRST_BRANCH_VISIT,
	YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED,
	YotiCallbackTopics.SESSION_COMPLETION,
];

export type TopicStatus =
	| "RUNNING"
	| "SUCCEEDED"
	| "FAILED"
	| "TIMED_OUT"
	| "ABORTED"
	| "NOT_STARTED";

export type TopicResult = {
	topic: YotiCallbackTopics;
	status: TopicStatus;
	executionArn?: string;
	// Step Functions error name and cause for failed executions, or why we could not start one
	error?: string;
	cause?: string;
};

export type TriggerCallbacksResult =
	| { statusCode: 200 | 500; body: { sessionId: string; results: TopicResult[] } }
	| { statusCode: 404 | 409; body: ErrorBody };

export type WaitOptions = {
	// Overall time to wait for executions to finish. Must stay below the API Gateway 29s timeout.
	waitMs?: number;
	pollIntervalMs?: number;
};

const WAIT_MS_DEFAULT = 20_000;
const POLL_INTERVAL_MS_DEFAULT = 1_000;
const CAUSE_LENGTH_MAX = 500;

export async function triggerCallbacks(
	dynamoClient: DynamoClient,
	stepFunctionsClient: SFNClient,
	sessionId: string,
	{ waitMs = WAIT_MS_DEFAULT, pollIntervalMs = POLL_INTERVAL_MS_DEFAULT }: WaitOptions = {},
): Promise<TriggerCallbacksResult> {
	const topics = TOPICS_IN_ORDER;

	const session = await dynamoClient.send(
		new GetCommand({
			TableName: process.env.SESSION_TABLE,
			Key: { sessionId } satisfies SessionKey,
		}),
	);
	if (session.Item === undefined) {
		return { statusCode: 404, body: { message: "Session not found" } };
	}

	// The state machine's session_id is the Yoti session id, not the F2F session id.
	const yotiSessionId: unknown = session.Item.yotiSessionId;
	if (typeof yotiSessionId !== "string" || yotiSessionId.length === 0) {
		return { statusCode: 409, body: { message: "Session has no yotiSessionId" } };
	}

	// Deliberately serial: each topic starts only after the previous StartExecution has returned,
	// so executions are started in topic order. Chained rather than awaited in a loop.
	const results = await topics.reduce<Promise<TopicResult[]>>(async (previousResults, topic) => {
		const resultsSoFar = await previousResults;
		const result = await startExecution(stepFunctionsClient, yotiSessionId, topic);
		return [...resultsSoFar, result];
	}, Promise.resolve([]));

	const finished = await waitForExecutions(
		stepFunctionsClient,
		results,
		waitMs,
		pollIntervalMs,
	);

	// RUNNING at the deadline is not a failure; the page tells the user to check again later.
	const anyFailed = finished.some(
		(result) => result.status !== "SUCCEEDED" && result.status !== "RUNNING",
	);
	return { statusCode: anyFailed ? 500 : 200, body: { sessionId, results: finished } };
}

// Executions are asynchronous, so poll DescribeExecution (all in parallel) until none are RUNNING
// or the deadline passes. Each poll depends on the previous one, so this recurses rather than
// awaiting inside a loop.
async function waitForExecutions(
	stepFunctionsClient: SFNClient,
	results: TopicResult[],
	waitMs: number,
	pollIntervalMs: number,
	deadline: number = Date.now() + waitMs,
): Promise<TopicResult[]> {
	if (
		!results.some((result) => result.status === "RUNNING") ||
		Date.now() >= deadline
	) {
		return results;
	}

	await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	const polled = await Promise.all(
		results.map((result) => describeExecution(stepFunctionsClient, result)),
	);
	return waitForExecutions(stepFunctionsClient, polled, waitMs, pollIntervalMs, deadline);
}

async function describeExecution(
	stepFunctionsClient: SFNClient,
	result: TopicResult,
): Promise<TopicResult> {
	if (result.status !== "RUNNING" || result.executionArn === undefined) {
		return result;
	}
	try {
		const output = await stepFunctionsClient.send(
			new DescribeExecutionCommand({ executionArn: result.executionArn }),
		);
		if (output.status === undefined || output.status === "RUNNING") {
			return result;
		}
		return {
			...result,
			status: output.status as TopicStatus,
			error: output.error,
			cause: output.cause?.slice(0, CAUSE_LENGTH_MAX),
		};
	} catch (error) {
		// Leave it RUNNING; the next poll (or the deadline) decides
		logger.warn("Unable to describe yoti callback execution", { error });
		return result;
	}
}

async function startExecution(
	stepFunctionsClient: SFNClient,
	yotiSessionId: string,
	topic: YotiCallbackTopics,
): Promise<TopicResult> {
	try {
		const output = await stepFunctionsClient.send(
			new StartExecutionCommand({
				input: JSON.stringify({ session_id: yotiSessionId, topic }),
				name: `${yotiSessionId}-${topic}-${Date.now()}`,
				stateMachineArn: process.env.STATE_MACHINE_ARN,
			}),
		);
		logger.info("Started yoti callback state machine", { topic });
		return { topic, status: "RUNNING", executionArn: output?.executionArn };
	} catch (error) {
		logger.error({
			message: "There was an error executing the yoti callback step function",
			error,
		});
		return { topic, status: "NOT_STARTED", error: "Failed to start execution" };
	}
}
