/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../PersonInfoHandler";
import { VALID_PERSON_INFO } from "./data/person-info-events";
import { CONTEXT } from "./data/context";
import { mock } from "jest-mock-extended";
import { HttpCodesEnum } from "../../models/enums/HttpCodesEnum";
import { PersonInfoRequestProcessor } from "../../services/PersonInfoRequestProcessor";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedPersonInfoRequestProcessor = mock<PersonInfoRequestProcessor>();
jest.mock("../../utils/Config", () => ({
	getParameter: (parameter: string) => parameter,
}));

// eslint-disable-next-line max-lines-per-function
describe("PersonInfoHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("returns error when x-govuk-signin-session-id header isn't passed", async () => {
		const message = `Missing header: ${Constants.X_SESSION_ID} is required`;

		const response = await lambdaHandler({ ...VALID_PERSON_INFO, headers: {} }, CONTEXT);

		expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("returns error when x-govuk-signin-session-id header is invalid", async () => {
		const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;

		const response = await lambdaHandler({ ...VALID_PERSON_INFO, headers: { [Constants.X_SESSION_ID]: "1" } }, CONTEXT);

		expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	it("return success when PersonInfoRequestProcessor completes successfully", async () => {
		PersonInfoRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedPersonInfoRequestProcessor);

		await lambdaHandler(VALID_PERSON_INFO, CONTEXT);

		expect(mockedPersonInfoRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("return error when PersonInfoRequestProcessor throws an error", async () => {
		PersonInfoRequestProcessor.getInstance = jest.fn().mockReturnValue(mockedPersonInfoRequestProcessor);
		mockedPersonInfoRequestProcessor.processRequest.mockRejectedValueOnce("Error");

		const response = await lambdaHandler(VALID_PERSON_INFO, CONTEXT);

		expect(mockedPersonInfoRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(response.statusCode).toEqual(HttpCodesEnum.SERVER_ERROR);
		expect(response.body).toBe("Server Error");
	});
});
