import { logger } from "@govuk-one-login/cri-logger";
import {
	DescribeExecutionCommand,
	StartExecutionCommand,
} from "@aws-sdk/client-sfn";
import { listSessions } from "../../yotiCallbackTestUI/client/list-sessions";
import { triggerCallbacks } from "../../yotiCallbackTestUI/client/trigger-callbacks";

vi.mock("@govuk-one-login/cri-logger");

vi.mock("@aws-sdk/lib-dynamodb", () => ({
	ScanCommand: vi.fn(function(params) {
		return { commandName: "Scan", ...params };
	}),
	GetCommand: vi.fn(function(params) {
		return { commandName: "Get", ...params };
	}),
}));

vi.mock("@aws-sdk/client-sfn", () => ({
	SFNClient: vi.fn(),
	StartExecutionCommand: vi.fn(function(params) {
		return params;
	}),
	DescribeExecutionCommand: vi.fn(function(params) {
		return params;
	}),
}));

const SESSION_ID = "11111111-2222-3333-4444-555555555555";
const YOTI_SESSION_ID = "eb26c8e0-397b-4f5e-b7a5-62cd0c6e510b";

const dynamoSend = vi.fn();
const sfnSend = vi.fn();
const dynamoClient = { send: dynamoSend } as any;
const stepFunctionsClient = { send: sfnSend } as any;

describe("Yoti callback test UI client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SESSION_TABLE = "session-table";
		process.env.STATE_MACHINE_ARN =
			"arn:aws:states:eu-west-2:000000000000:stateMachine:test";
	});

	describe("listSessions", () => {
		const session = (id: string, createdDate?: number) => ({
			sessionId: id,
			authSessionState: "F2F_ACCESS_TOKEN_ISSUED",
			createdDate,
		});

		it("lists sessions using a projection of safe fields, filtered to F2F_ACCESS_TOKEN_ISSUED", async () => {
			dynamoSend.mockResolvedValueOnce({ Items: [session(SESSION_ID, 1)] });

			const response = await listSessions(dynamoClient, undefined);

			expect(response).toEqual({
				statusCode: 200,
				body: {
					sessions: [session(SESSION_ID, 1)],
					nextToken: undefined,
					truncated: false,
				},
			});
			const command = dynamoSend.mock.calls[0][0];
			expect(command.TableName).toBe("session-table");
			expect(command.ProjectionExpression).not.toContain("accessToken");
			expect(Object.values(command.ExpressionAttributeNames)).not.toContain(
				"authorizationCode",
			);
			expect(command.ExclusiveStartKey).toBeUndefined();
			expect(command.FilterExpression).toBe(
				"#authSessionState = :authSessionState",
			);
			// plain value for the document client, not a raw { S: ... } attribute value
			expect(command.ExpressionAttributeValues).toEqual({
				":authSessionState": "F2F_ACCESS_TOKEN_ISSUED",
			});
		});

		it("scans every page and returns sessions newest first", async () => {
			dynamoSend
				.mockResolvedValueOnce({
					Items: [session("old", 100), session("newest", 300)],
					LastEvaluatedKey: { sessionId: "a" },
				})
				.mockResolvedValueOnce({
					Items: [session("middle", 200), session("undated")],
				});

			const response = await listSessions(dynamoClient, undefined);

			expect(dynamoSend).toHaveBeenCalledTimes(2);
			expect(dynamoSend.mock.calls[1][0].ExclusiveStartKey).toEqual({
				sessionId: "a",
			});
			const ids =
				response.statusCode === 200
					? response.body.sessions.map((item) => item.sessionId)
					: [];
			expect(ids).toEqual(["newest", "middle", "old", "undated"]);
		});

		it("pages the sorted list by offset using nextToken", async () => {
			const items = Array.from({ length: 25 }, (_, i) => session(`s${i}`, i));
			dynamoSend.mockResolvedValue({ Items: items });

			const first = await listSessions(dynamoClient, undefined);
			const firstBody = first.statusCode === 200 ? first.body : undefined;
			expect(firstBody?.sessions).toHaveLength(20);
			expect(firstBody?.sessions[0].sessionId).toBe("s24");
			expect(firstBody?.nextToken).toBe("20");

			const second = await listSessions(dynamoClient, firstBody?.nextToken);
			const secondBody = second.statusCode === 200 ? second.body : undefined;
			expect(secondBody?.sessions.map((item) => item.sessionId)).toEqual([
				"s4",
				"s3",
				"s2",
				"s1",
				"s0",
			]);
			expect(secondBody?.nextToken).toBeUndefined();
		});

		it("flags truncation when the scan cap is hit", async () => {
			dynamoSend.mockResolvedValue({
				Items: [],
				LastEvaluatedKey: { sessionId: "more" },
			});

			const response = await listSessions(dynamoClient, undefined);

			expect(dynamoSend).toHaveBeenCalledTimes(50);
			expect(response.statusCode === 200 && response.body.truncated).toBe(true);
		});

		it.each([
			{ name: "not a number", nextToken: "!!!not-valid" },
			{ name: "negative", nextToken: "-5" },
			{ name: "a decimal", nextToken: "1.5" },
		])("returns 400 when nextToken is $name", async ({ nextToken }) => {
			const response = await listSessions(dynamoClient, nextToken);

			expect(response).toEqual({
				statusCode: 400,
				body: { message: "Invalid nextToken" },
			});
			expect(dynamoSend).not.toHaveBeenCalled();
		});
	});

	describe("triggerCallbacks", () => {
		const FAST = { waitMs: 200, pollIntervalMs: 1 };
		const session = () =>
			dynamoSend.mockResolvedValueOnce({
				Item: { sessionId: SESSION_ID, yotiSessionId: YOTI_SESSION_ID },
			});

		// Start returns an ARN per call; Describe answers from the given status per ARN
		const executions = (
			statuses: Record<
				string,
				{ status: string; error?: string; cause?: string }
			>,
		) => {
			let started = 0;
			sfnSend.mockImplementation(async (command: any) => {
				if (command.executionArn !== undefined) {
					return statuses[command.executionArn];
				}
				started += 1;
				return { executionArn: `arn:exec-${started}` };
			});
		};

		it("starts each topic in order using the yoti session id", async () => {
			session();
			executions({
				"arn:exec-1": { status: "SUCCEEDED" },
				"arn:exec-2": { status: "SUCCEEDED" },
				"arn:exec-3": { status: "SUCCEEDED" },
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(200);
			const inputs = vi
				.mocked(StartExecutionCommand)
				.mock.calls.map(([params]) => JSON.parse(params.input as string));
			expect(inputs).toEqual([
				{ session_id: YOTI_SESSION_ID, topic: "first_branch_visit" },
				{ session_id: YOTI_SESSION_ID, topic: "thank_you_email_requested" },
				{ session_id: YOTI_SESSION_ID, topic: "session_completion" },
			]);
			const params = vi.mocked(StartExecutionCommand).mock.calls[0][0];
			expect(params.stateMachineArn).toBe(process.env.STATE_MACHINE_ARN);
			expect(params.name).toContain(`${YOTI_SESSION_ID}-first_branch_visit-`);
			expect(dynamoSend.mock.calls[0][0].Key).toEqual({
				sessionId: SESSION_ID,
			});
		});

		it("waits for the executions and reports how each one finished", async () => {
			session();
			executions({
				"arn:exec-1": { status: "SUCCEEDED" },
				"arn:exec-2": {
					status: "FAILED",
					error: "TypeError",
					cause: "Cannot read properties of undefined (reading 'created_at')",
				},
				"arn:exec-3": { status: "SUCCEEDED" },
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(500);
			expect(response.body).toEqual({
				sessionId: SESSION_ID,
				results: [
					{
						topic: "first_branch_visit",
						status: "SUCCEEDED",
						executionArn: "arn:exec-1",
						error: undefined,
						cause: undefined,
					},
					{
						topic: "thank_you_email_requested",
						status: "FAILED",
						executionArn: "arn:exec-2",
						error: "TypeError",
						cause: "Cannot read properties of undefined (reading 'created_at')",
					},
					{
						topic: "session_completion",
						status: "NOT_STARTED",
						error: "Not started: previous topic did not succeed",
					},
				],
			});
			expect(vi.mocked(StartExecutionCommand)).toHaveBeenCalledTimes(2);
		});

		it("does not start the next topic until the previous one has succeeded", async () => {
			session();
			const events: string[] = [];
			let started = 0;
			let describes = 0;
			sfnSend.mockImplementation(async (command: any) => {
				if (command.executionArn === undefined) {
					started += 1;
					events.push(`start-${started}`);
					return { executionArn: `arn:exec-${started}` };
				}
				describes += 1;
				events.push(`describe-${command.executionArn}`);
				return { status: describes % 2 === 0 ? "SUCCEEDED" : "RUNNING" };
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(200);
			expect(events).toEqual([
				"start-1",
				"describe-arn:exec-1",
				"describe-arn:exec-1",
				"start-2",
				"describe-arn:exec-2",
				"describe-arn:exec-2",
				"start-3",
				"describe-arn:exec-3",
				"describe-arn:exec-3",
			]);
		});

		it("keeps polling until a running execution finishes", async () => {
			session();
			let describes = 0;
			let started = 0;
			sfnSend.mockImplementation(async (command: any) => {
				if (command.executionArn === undefined) {
					started += 1;
					return { executionArn: `arn:exec-${started}` };
				}
				describes += 1;
				return { status: describes > 3 ? "SUCCEEDED" : "RUNNING" };
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(200);
			expect(
				vi.mocked(DescribeExecutionCommand).mock.calls.length,
			).toBeGreaterThan(3);
			const statuses =
				"results" in response.body
					? response.body.results.map((result) => result.status)
					: [];
			expect(statuses).toEqual(["SUCCEEDED", "SUCCEEDED", "SUCCEEDED"]);
		});

		it("returns RUNNING, not a failure, when the wait deadline passes", async () => {
			session();
			executions({
				"arn:exec-1": { status: "SUCCEEDED" },
				"arn:exec-2": { status: "RUNNING" },
				"arn:exec-3": { status: "RUNNING" },
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				{ waitMs: 20, pollIntervalMs: 1 },
			);

			expect(response.statusCode).toBe(200);
			const statuses =
				"results" in response.body
					? response.body.results.map((result) => result.status)
					: [];
			expect(statuses).toEqual(["SUCCEEDED", "RUNNING", "NOT_STARTED"]);
			expect(vi.mocked(StartExecutionCommand)).toHaveBeenCalledTimes(2);
		});

		it("does not wait when waitMs is 0", async () => {
			session();
			executions({});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				{ waitMs: 0 },
			);

			expect(vi.mocked(DescribeExecutionCommand)).not.toHaveBeenCalled();
			expect(response.statusCode).toBe(200);
		});

		it("returns 404 when the session does not exist", async () => {
			dynamoSend.mockResolvedValueOnce({});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(404);
			expect(sfnSend).not.toHaveBeenCalled();
		});

		it("returns 409 when the session has no yotiSessionId", async () => {
			dynamoSend.mockResolvedValueOnce({ Item: { sessionId: SESSION_ID } });

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(409);
			expect(sfnSend).not.toHaveBeenCalled();
		});

		it("returns 500 and logs when the step function fails to start", async () => {
			const error = new Error("Failed to execute step function");
			session();
			sfnSend.mockRejectedValue(error);

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(500);
			expect(logger.error).toHaveBeenCalledWith({
				message: "There was an error executing the yoti callback step function",
				error,
			});
			const statuses =
				"results" in response.body
					? response.body.results.map((result) => result.status)
					: [];
			expect(statuses).toEqual(["NOT_STARTED", "NOT_STARTED", "NOT_STARTED"]);
		});

		it("stops at a start failure and reports earlier results", async () => {
			session();
			let calls = 0;
			sfnSend.mockImplementation(async (command: any) => {
				if (command.executionArn !== undefined) {
					return { status: "SUCCEEDED" };
				}
				calls += 1;
				if (calls === 2) {
					throw new Error("boom");
				}
				return { executionArn: `arn:exec-${calls}` };
			});

			const response = await triggerCallbacks(
				dynamoClient,
				stepFunctionsClient,
				SESSION_ID,
				FAST,
			);

			expect(response.statusCode).toBe(500);
			const statuses =
				"results" in response.body
					? response.body.results.map((result) => result.status)
					: [];
			expect(statuses).toEqual(["SUCCEEDED", "NOT_STARTED", "NOT_STARTED"]);
		});
	});
});
