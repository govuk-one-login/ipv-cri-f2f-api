import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoClient, ErrorBody } from "./common";

const PAGE_SIZE = 20;
const SCAN_REQUESTS_MAX = 50; // 50 x up to 1MB per scan; bounds the work done within the API Gateway 29s timeout
const SESSION_AUTH_STATE = "F2F_ACCESS_TOKEN_ISSUED";
const SESSION_FIELDS_SAFE = [
	"sessionId",
	"state",
	"authSessionState",
	"createdDate",
	"expiryDate",
	"yotiSessionId",
];

export type SessionSummary = {
	sessionId: string;
	state?: string;
	authSessionState?: string;
	createdDate?: number;
	expiryDate?: number;
	yotiSessionId?: string;
};

export type ListSessionsResult =
	| {
		statusCode: 200;
		body: {
			sessions: SessionSummary[];
			nextToken: string | undefined;
			// true when the scan cap was hit, so older or newer sessions may be missing from the list
			truncated: boolean;
		};
	}
	| { statusCode: 400; body: ErrorBody };

// DynamoDB cannot sort a Scan (and the session table has no sort key to Query on), so we scan every
// matching session, sort newest first here, and page through the sorted list by offset.
// nextToken is the offset of the next page.
export async function listSessions(
	dynamoClient: DynamoClient,
	nextToken: string | undefined,
): Promise<ListSessionsResult> {
	const offset = nextToken === undefined ? 0 : decodeNextToken(nextToken);
	if (offset === undefined) {
		return { statusCode: 400, body: { message: "Invalid nextToken" } };
	}

	const { sessions, truncated } = await scanSessions(dynamoClient);
	sessions.sort((a, b) => (b.createdDate ?? 0) - (a.createdDate ?? 0));

	const end = offset + PAGE_SIZE;
	return {
		statusCode: 200,
		body: {
			sessions: sessions.slice(offset, end),
			nextToken: end < sessions.length ? String(end) : undefined,
			truncated,
		},
	};
}

// Each scan needs the previous scan's LastEvaluatedKey, so the pages are fetched one after another
// (recursively, rather than awaiting inside a loop).
async function scanSessions(
	dynamoClient: DynamoClient,
	startKey?: Record<string, unknown>,
	sessionsSoFar: SessionSummary[] = [],
	scans = 0,
): Promise<{ sessions: SessionSummary[]; truncated: boolean }> {
	const result = await dynamoClient.send(
		new ScanCommand({
			TableName: process.env.SESSION_TABLE,
			ExclusiveStartKey: startKey,
			ProjectionExpression: SESSION_FIELDS_SAFE.map(
				(field) => `#${field}`,
			).join(", "),
			ExpressionAttributeNames: Object.fromEntries(
				SESSION_FIELDS_SAFE.map((field) => [`#${field}`, field]),
			),
			// The document client marshals plain JS values; raw { S: "..." } would be stored as a map
			ExpressionAttributeValues: { ":authSessionState": SESSION_AUTH_STATE },
			FilterExpression: "#authSessionState = :authSessionState",
		}),
	);
	const sessions = [
		...sessionsSoFar,
		...((result.Items ?? []) as SessionSummary[]),
	];
	const lastKey = result.LastEvaluatedKey;

	if (lastKey === undefined) {
		return { sessions, truncated: false };
	}
	if (scans + 1 >= SCAN_REQUESTS_MAX) {
		return { sessions, truncated: true };
	}
	return scanSessions(dynamoClient, lastKey, sessions, scans + 1);
}

function decodeNextToken(nextToken: string): number | undefined {
	return /^\d{1,9}$/.test(nextToken) ? Number(nextToken) : undefined;
}
