/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../PersonInfoHandler";
import { VALID_ADDRESS_LOCATIONS } from "./data//addressLocations-event";
import { CONTEXT } from "./data/context";
import { mock } from "jest-mock-extended";
import { HttpCodesEnum } from "../../models/enums/HttpCodesEnum";
import { AddressLocationsProcessor } from "../../services/AddressLocationsProcessor";
import { Constants } from "../../utils/Constants";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedAddressLocationsProcessor = mock<AddressLocationsProcessor>();
jest.mock("../../utils/Config", () => ({
	getParameter: (parameter: string) => parameter,
}));

// eslint-disable-next-line max-lines-per-function
describe("AddressLocationsHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("returns error when both headers aren't passed", async () => {
		const message = "Missing header: x-govuk-signin-session-id is required";

		const response = await lambdaHandler({ ...VALID_ADDRESS_LOCATIONS, headers: {} }, CONTEXT );

		expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
		expect(response.body).toBe(message);
		expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	});

	// it("returns error when x-govuk-signin-session-id header isn't passed", async () => {
	// 	const message = `Missing header: ${Constants.X_SESSION_ID} is required`;

	// 	const response = await lambdaHandler({ ...VALID_ADDRESS_LOCATIONS, headers: { [Constants.X_SESSION_ID]: "" }}, CONTEXT );

	// 	expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
	// 	expect(response.body).toBe(message);
	// 	expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	// });

	// it("returns error when x-govuk-signin-session-id header is invalid", async () => {
	// 	const message = `${Constants.X_SESSION_ID} header does not contain a valid uuid`;

	// 	const response = await lambdaHandler({ ...VALID_ADDRESS_LOCATIONS, headers: { [Constants.X_SESSION_ID]: "1" } }, CONTEXT);

	// 	expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
	// 	expect(response.body).toBe(message);
	// 	expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
	// });

	// it("returns error when postcode header isn't passed", async () => {
	// 	const message = `Invalid request: missing ${Constants.POSTCODE_HEADER}`;

	// 	const response = await lambdaHandler({ ...VALID_ADDRESS_LOCATIONS, headers: { [Constants.POSTCODE_HEADER]: ""} }, CONTEXT);

	// 	expect(response.statusCode).toEqual(HttpCodesEnum.BAD_REQUEST);
	// 	expect(response.body).toBe(message);
	// 	expect(loggerSpy).toHaveBeenCalledWith({ message, messageCode: MessageCodes.MISSING_POSTCODE });
	// });

	// it("return success when AddressLocationsProcessor completes successfully", async () => {
	// 	AddressLocationsProcessor.getInstance = jest.fn().mockReturnValue(mockedAddressLocationsProcessor);

	// 	await lambdaHandler(VALID_ADDRESS_LOCATIONS, CONTEXT);

	// 	expect(mockedAddressLocationsProcessor.processRequest).toHaveBeenCalledTimes(1);
	// });

	// it("return error when AddressLocationsProcessor throws an error", async () => {
	// 	AddressLocationsProcessor.getInstance = jest.fn().mockReturnValue(mockedAddressLocationsProcessor);
	// 	mockedAddressLocationsProcessor.processRequest.mockRejectedValueOnce("Error");

	// 	const response = await lambdaHandler(VALID_ADDRESS_LOCATIONS, CONTEXT);

	// 	expect(mockedAddressLocationsProcessor.processRequest).toHaveBeenCalledTimes(1);
	// 	expect(response.statusCode).toEqual(HttpCodesEnum.SERVER_ERROR);
	// 	expect(response.body).toBe("Server Error");
	// });
});
