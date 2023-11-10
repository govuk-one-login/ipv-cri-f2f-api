import { getAuthorizationCodeExpirationEpoch } from "../../../utils/DateTimeUtils";

const mockDateObject = new Date("2023-02-09T15:00:00.652Z");
jest.spyOn(Date, "now").mockImplementation(() => mockDateObject.getTime());

describe("UtilTest", () => {
	it("should validate return a valid time in epoch after 10 secs when TTL is set", () => {
		const res = getAuthorizationCodeExpirationEpoch("10");
		expect(res).toBe(1675954810652);
	});

	it("should validate return a valid time in epoch after 10 mins when TTL is not set", () => {
		const res = getAuthorizationCodeExpirationEpoch("");
		expect(res).toBe(1675955400652);
	});
});
