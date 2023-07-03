import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../AbortHandler";
import { AbortRequestProcessor } from "../../services/AbortRequestProcessor";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { Response, SECURITY_HEADERS } from "../../utils/Response";
import { RESOURCE_NOT_FOUND, UNSUPPORTED_METHOD, VALID_REQUEST, INVALID_SESSION_ID, MISSING_SESSION_ID } from "./data/abort-events";

const mockAbortRequestProcessor = mock<AbortRequestProcessor>();

describe("AbortHandler", () => {
	it("returns not found when resource not found", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(AbortRequestProcessor);

		return expect(lambdaHandler(RESOURCE_NOT_FOUND, "")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, "Requested resource does not exist"));
	});

	it("return not found when unsupported http method tried for documentSelection", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(AbortRequestProcessor);

		return expect(lambdaHandler(UNSUPPORTED_METHOD, "")).resolves.toEqual(new Response(HttpCodesEnum.NOT_FOUND, ""));
	});

	it("return Unauthorized if session id is missing", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);

		return expect(lambdaHandler(MISSING_SESSION_ID, "")).resolves.toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return Unauthorized if session id validation fails", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);

		const response = await lambdaHandler(INVALID_SESSION_ID, "");
		expect(response).toEqual({
			statusCode: 401,
			headers: SECURITY_HEADERS,
			body: "Unauthorized",
		});
	});

	it("return success for valid request", async () => {
		AbortRequestProcessor.getInstance = jest.fn().mockReturnValue(mockAbortRequestProcessor);

		await lambdaHandler(VALID_REQUEST, "");
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockAbortRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});
});
