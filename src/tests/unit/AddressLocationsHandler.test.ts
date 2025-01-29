/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../AddressLocationsHandler";
import { VALID_AUTHCODE } from "./data/auth-events";
import { CONTEXT } from "./data/context";
import { HttpCodesEnum } from "../../models/enums/HttpCodesEnum";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { getParameter } from "../../utils/Config";

jest.mock("../../utils/Config", () => ({
	getParameter: jest.fn(),
}));

describe("PersonInfoKeyHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("returns key fetched from SSM", async () => {
		const key = "person-info/PRIVATE_KEY";
		(getParameter as jest.Mock).mockResolvedValueOnce(key);
		const response = await lambdaHandler(VALID_AUTHCODE, CONTEXT);

		expect(response.statusCode).toEqual(HttpCodesEnum.OK);
		expect(response.body).toBe(JSON.stringify({ key }));
	});

	it("returns error if there is a problem fetching from SSM", async () => {
		(getParameter as jest.Mock).mockRejectedValueOnce("Error");
		const response = await lambdaHandler(VALID_AUTHCODE, CONTEXT);

		expect(response.statusCode).toEqual(HttpCodesEnum.SERVER_ERROR);
		expect(response.body).toBe("Server Error");
		expect(loggerSpy).toHaveBeenCalledWith({
			message: "Error fetching OS API key",
			error: "Error",
			messageCode: MessageCodes.SERVER_ERROR,
		});
	});
});
