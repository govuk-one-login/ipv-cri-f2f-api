import { SFNClient } from "@aws-sdk/client-sfn";
import { fromEnv, fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { createStepFunctionsClient, credentialsProvider } from "../../../yotiCallbackTestUI/client/common";
import { inlineAssets } from "../../../yotiCallbackTestUI/util/inline-assets";
import { sessionsModel, triggerResultModel } from "../../../yotiCallbackTestUI/views/sessions-view";

vi.mock("@aws-sdk/client-sfn", () => ({ SFNClient: vi.fn() }));
vi.mock("@aws-sdk/credential-providers", () => ({
	fromEnv: vi.fn(() => "env-credentials"),
	fromNodeProviderChain: vi.fn(() => "chain-credentials"),
}));
vi.mock("../../../yotiCallbackTestUI/client/dynamo", () => ({ createDynamoDbClient: vi.fn() }));

describe("credentials", () => {
	afterEach(() => {
		delete process.env.AWS_LAMBDA_FUNCTION_NAME;
	});

	it("uses the default provider chain outside Lambda, so SSO and profile logins work", () => {
		expect(credentialsProvider()).toBe("chain-credentials");
		expect(fromNodeProviderChain).toHaveBeenCalled();
	});

	it("uses the environment inside Lambda", () => {
		process.env.AWS_LAMBDA_FUNCTION_NAME = "F2F-YotiCallbackTestUI";

		expect(credentialsProvider()).toBe("env-credentials");
		expect(fromEnv).toHaveBeenCalled();
	});

	it("creates a step functions client with the region and credentials", () => {
		createStepFunctionsClient();

		expect(SFNClient).toHaveBeenCalledWith({ region: process.env.REGION, credentials: "chain-credentials" });
	});
});

describe("inlineAssets", () => {
	it("inlines the fonts and crest and removes the woff fallbacks", () => {
		const css =
			'a{src:url(/assets/fonts/light-94a07e06a1-v2.woff2) format("woff2"),url(/assets/fonts/light-94a07e06a1-v2.woff) format("woff")}' +
			"b{src:url(/assets/fonts/bold-b542beb274-v2.woff2)}c{background:url(/assets/images/govuk-crest.svg)}";

		const result = inlineAssets(css, { lightFont: "data:LIGHT", boldFont: "data:BOLD", crest: "data:CREST" });

		expect(result).toContain("url(data:LIGHT)");
		expect(result).toContain("url(data:BOLD)");
		expect(result).toContain("url(data:CREST)");
		expect(result).not.toContain("/assets/");
		expect(result).not.toContain('format("woff")');
	});
});

describe("views", () => {
	it("leaves dates empty when a session has none", () => {
		const model = sessionsModel({ sessions: [{ sessionId: "a" }] });

		expect(model.sessions[0].createdDate).toBeUndefined();
		expect(model.sessions[0].expiryDate).toBeUndefined();
		expect(model.errorList).toEqual([]);
	});

	it("puts an error into the error summary", () => {
		expect(sessionsModel({ error: "Nope" }).errorList).toEqual([{ text: "Nope", href: undefined }]);
	});

	it.each([
		{ name: "the message from a JSON cause", cause: '{"errorMessage":"boom"}', detail: "boom" },
		{ name: "a JSON cause without a message as is", cause: '{"other":1}', detail: '{"other":1}' },
		{ name: "a plain text cause as is", cause: "plain failure", detail: "plain failure" },
		{ name: "nothing when there is no cause", cause: undefined, detail: undefined },
	])("shows $name", ({ cause, detail }) => {
		const model = triggerResultModel({
			sessionId: "a",
			results: [{ topic: "first_branch_visit" as any, status: "FAILED", cause }],
		});

		expect(model.results[0].detail).toBe(detail);
		expect(model.anyFailed).toBe(true);
		expect(model.anyRunning).toBe(false);
	});

	it("flags running executions without calling them failed", () => {
		const model = triggerResultModel({
			sessionId: "a",
			results: [{ topic: "session_completion" as any, status: "RUNNING" }],
		});

		expect(model.anyRunning).toBe(true);
		expect(model.anyFailed).toBe(false);
	});
});
