import { createApp } from "../../../yotiCallbackTestUI/app";
import {
	FAVICON_PATH,
	SESSIONS_PATH,
	STYLESHEET_PATH,
	UI_ROOT,
} from "../../../yotiCallbackTestUI/paths";
import { listSessionsResponds, mocks, send, SESSION } from "./helpers";

// Dereferenced when called, not when the factory runs, so import order doesn't matter
vi.mock("../../../yotiCallbackTestUI/client/list-sessions", () => ({
	listSessions: (...args: unknown[]) => mocks.listSessions(...args),
}));
vi.mock("../../../yotiCallbackTestUI/client/trigger-callbacks", () => ({
	triggerCallbacks: (...args: unknown[]) => mocks.triggerCallbacks(...args),
}));
vi.mock("../../../yotiCallbackTestUI/client/dynamo", () => ({
	createDynamoDbClient: vi.fn(() => ({ send: vi.fn() })),
}));
vi.mock("@aws-sdk/client-sfn", () => ({
	SFNClient: vi.fn(function () {
		return { send: vi.fn() };
	}),
}));

const get = (path: string, query?: Record<string, string>) => send(createApp(), "GET", path, query);
const post = (path: string) => send(createApp(), "POST", path);

const callbackPath = (sessionId: string) => `${SESSIONS_PATH}/${sessionId}/callback`;

describe("Yoti callback test UI", () => {
	describe("assets", () => {
		it("serves the stylesheet", async () => {
			const response = await get(STYLESHEET_PATH);

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("text/css");
			expect(response.headers["cache-control"]).toContain("immutable");
		});

		it("serves the favicon", async () => {
			const response = await get(FAVICON_PATH);

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("image/svg+xml");
			expect(response.text).toContain("<svg");
		});
	});

	describe("GET /yoti-callback-test-ui", () => {
		it("lists sessions with a Trigger button that posts to the callback route", async () => {
			listSessionsResponds([SESSION]);

			const response = await get(UI_ROOT);

			expect(response.status).toBe(200);
			expect(response.text).toContain(SESSION.sessionId);
			expect(response.text).toContain(SESSION.yotiSessionId);
			expect(response.text).toContain("F2F_YOTI_SESSION_CREATED");
			expect(response.text).toContain("2023-11-14 22:13:20");
			expect(response.text).toContain(`method="post" action="${callbackPath(SESSION.sessionId)}"`);
			expect(response.text).toContain("Trigger");
			expect(response.text).not.toContain("govuk-error-summary");
			expect(response.text).not.toContain("Next page");
			expect(mocks.listSessions).toHaveBeenCalledWith(expect.anything(), undefined);
		});

		it("url-encodes the session id in the form action", async () => {
			listSessionsResponds([{ ...SESSION, sessionId: "a b/c" }]);

			const response = await get(UI_ROOT);

			expect(response.text).toContain(`action="${SESSIONS_PATH}/a%20b%2Fc/callback"`);
		});

		it("disables the button for a session with no yoti session id", async () => {
			listSessionsResponds([{ sessionId: "no-yoti" }]);

			const response = await get(UI_ROOT);

			expect(response.text).toContain("disabled");
		});

		it("says when there are no sessions", async () => {
			listSessionsResponds([]);

			const response = await get(UI_ROOT);

			expect(response.text).toContain("No sessions found.");
		});

		it("links to the next page and passes nextToken through", async () => {
			listSessionsResponds([SESSION], { nextToken: "20" });

			const response = await get(UI_ROOT);
			expect(response.text).toContain(`href="${UI_ROOT}?nextToken=20"`);

			await get(UI_ROOT, { nextToken: "20" });
			expect(mocks.listSessions).toHaveBeenLastCalledWith(expect.anything(), "20");
		});

		it("ignores an empty nextToken", async () => {
			listSessionsResponds([]);

			await get(UI_ROOT, { nextToken: "" });

			expect(mocks.listSessions).toHaveBeenCalledWith(expect.anything(), undefined);
		});

		it("warns when the table was too large to scan in full", async () => {
			listSessionsResponds([SESSION], { truncated: true });

			const response = await get(UI_ROOT);

			expect(response.text).toContain("too large to scan in full");
		});

		it("renders an error with the status when listing fails", async () => {
			mocks.listSessions.mockResolvedValue({ statusCode: 400, body: { message: "Invalid nextToken" } });

			const response = await get(UI_ROOT, { nextToken: "x" });

			expect(response.status).toBe(400);
			expect(response.text).toContain("There is a problem");
			expect(response.text).toContain("Invalid nextToken");
		});

		it("shows an error passed back from a trigger", async () => {
			listSessionsResponds([]);

			const response = await get(UI_ROOT, { error: "Session not found" });

			expect(response.text).toContain("There is a problem");
			expect(response.text).toContain("Session not found");
		});
	});

	describe(`POST ${SESSIONS_PATH}/:sessionId/callback`, () => {
		it("renders how each execution finished", async () => {
			mocks.triggerCallbacks.mockResolvedValue({
				statusCode: 500,
				body: {
					sessionId: SESSION.sessionId,
					results: [
						{ topic: "first_branch_visit", status: "SUCCEEDED", executionArn: "arn:exec-1" },
						{
							topic: "thank_you_email_requested",
							status: "FAILED",
							executionArn: "arn:exec-2",
							error: "TypeError",
							cause: JSON.stringify({ errorMessage: "Cannot read properties of undefined" }),
						},
						{ topic: "session_completion", status: "RUNNING", executionArn: "arn:exec-3" },
					],
				},
			});

			const response = await post(callbackPath(SESSION.sessionId));

			expect(response.status).toBe(200);
			expect(mocks.triggerCallbacks).toHaveBeenCalledWith(expect.anything(), expect.anything(), SESSION.sessionId);
			expect(response.text).toContain("first_branch_visit");
			expect(response.text).toContain("SUCCEEDED");
			expect(response.text).toContain("govuk-tag--green");
			expect(response.text).toContain("TypeError");
			expect(response.text).toContain("Cannot read properties of undefined");
			expect(response.text).toContain("govuk-tag--red");
			expect(response.text).toContain("RUNNING");
			expect(response.text).toContain("govuk-tag--blue");
			expect(response.text).toContain("arn:exec-2");
			expect(response.text).toContain("One or more callbacks did not succeed");
			expect(response.text).toContain("still running");
			expect(response.text).toContain(`href="${UI_ROOT}"`);
		});

		it("shows no warnings when everything succeeded", async () => {
			mocks.triggerCallbacks.mockResolvedValue({
				statusCode: 200,
				body: {
					sessionId: SESSION.sessionId,
					results: [{ topic: "session_completion", status: "SUCCEEDED", executionArn: "arn:exec-1" }],
				},
			});

			const response = await post(callbackPath(SESSION.sessionId));

			expect(response.status).toBe(200);
			expect(response.text).not.toContain("did not succeed");
			expect(response.text).not.toContain("still running");
		});

		it.each([
			{ statusCode: 404, message: "Session not found" },
			{ statusCode: 409, message: "Session has no yotiSessionId" },
		])("redirects back to the list with the message on $statusCode", async ({ statusCode, message }) => {
			mocks.triggerCallbacks.mockResolvedValue({ statusCode, body: { message } });

			const response = await post(callbackPath(SESSION.sessionId));

			expect(response.status).toBe(302);
			expect(response.headers.location).toBe(`${UI_ROOT}?${new URLSearchParams({ error: message })}`);
		});
	});

	it("returns 404 for an unknown route", async () => {
		const response = await get(`${UI_ROOT}/nothing`);

		expect(response.status).toBe(404);
	});
});
