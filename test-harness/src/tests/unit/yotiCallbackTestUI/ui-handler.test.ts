import type { Context } from "aws-lambda";
import { lambdaHandler } from "../../../yotiCallbackTestUI/handler/ui-handler";
import { listSessionsResponds, mocks, SESSION } from "./helpers";

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

const EXECUTE_API_HOST = "abc123.execute-api.eu-west-2.amazonaws.com";
const CUSTOM_DOMAIN_HOST = "f2f.review-o.dev.account.gov.uk";

type RequestOptions = { method?: "GET" | "POST"; host?: string; query?: Record<string, string> };

// The parts of an API Gateway REST proxy event that serverless-express and the app use
const apiGatewayEvent = (path: string, { method = "GET", host = EXECUTE_API_HOST, query }: RequestOptions = {}) => {
	const proxy = path.replace(/^\/yoti-callback-test-ui\/?/, "");
	return {
		httpMethod: method,
		path,
		resource: proxy ? "/yoti-callback-test-ui/{proxy+}" : "/yoti-callback-test-ui",
		pathParameters: proxy ? { proxy } : null,
		multiValueQueryStringParameters: query
			? Object.fromEntries(Object.entries(query).map(([key, value]) => [key, [value]]))
			: null,
		multiValueHeaders: { host: [host], "x-forwarded-proto": ["https"] },
		body: null,
		isBase64Encoded: false,
		requestContext: { stage: "dev" },
	};
};

const invoke = (path: string, options?: RequestOptions) =>
	lambdaHandler(apiGatewayEvent(path, options) as any, {} as Context, () => undefined) as Promise<any>;

describe("Yoti callback test UI ui-handler", () => {
	beforeEach(() => {
		listSessionsResponds([SESSION]);
	});

	it("routes on the full path, not just the part {proxy+} matched", async () => {
		const response = await invoke("/yoti-callback-test-ui/favicon.svg");

		expect(response.statusCode).toBe(200);
		expect(response.multiValueHeaders["content-type"]).toContainEqual(expect.stringContaining("image/svg+xml"));
	});

	it("keeps the query string", async () => {
		await invoke("/yoti-callback-test-ui", { query: { nextToken: "20" } });

		expect(mocks.listSessions).toHaveBeenCalledWith(expect.anything(), "20");
	});

	it("prefixes the stage on links and form actions on the execute-api host", async () => {
		const response = await invoke("/yoti-callback-test-ui");

		expect(response.body).toContain(`action="/dev/yoti-callback-test-ui/sessions/${SESSION.sessionId}/callback"`);
		expect(response.body).toContain('href="/dev/yoti-callback-test-ui/govuk.css"');
	});

	it("does not prefix links and form actions on the custom domain", async () => {
		const response = await invoke("/yoti-callback-test-ui", { host: CUSTOM_DOMAIN_HOST });

		expect(response.body).toContain(`action="/yoti-callback-test-ui/sessions/${SESSION.sessionId}/callback"`);
		expect(response.body).toContain('href="/yoti-callback-test-ui/govuk.css"');
	});

	it("redirects with the stage prefix when a trigger cannot start", async () => {
		mocks.triggerCallbacks.mockResolvedValue({ statusCode: 404, body: { message: "Session not found" } });

		const response = await invoke(`/yoti-callback-test-ui/sessions/${SESSION.sessionId}/callback`, { method: "POST" });

		expect(response.statusCode).toBe(302);
		expect(response.multiValueHeaders.location).toEqual(["/dev/yoti-callback-test-ui?error=Session+not+found"]);
	});
});
