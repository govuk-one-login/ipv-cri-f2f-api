import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../AbortHandler";
import { AbortRequestProcessor } from "../../services/AbortRequestProcessor";
import { SECURITY_HEADERS } from "../../utils/Response";
import {
	VALID_REQUEST,
	INVALID_SESSION_ID,
	MISSING_SESSION_ID,
} from "./data/abort-events";

const mockAbortRequestProcessor = mock<AbortRequestProcessor>();

describe("AbortHandler", () => {
	it("return Unauthorized if session id is missing", async () => {
		AbortRequestProcessor.getInstance = jest
			.fn()
			.mockReturnValue(mockAbortRequestProcessor);

		return expect(lambdaHandler(MISSING_SESSION_ID, "")).resolves.toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return Unauthorized if session id validation fails", async () => {
		AbortRequestProcessor.getInstance = jest
			.fn()
			.mockReturnValue(mockAbortRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response).toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return success for valid request", async () => {
		AbortRequestProcessor.getInstance = jest
			.fn()
			.mockReturnValue(mockAbortRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockAbortRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
