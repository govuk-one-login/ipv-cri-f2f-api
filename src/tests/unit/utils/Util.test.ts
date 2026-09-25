import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import {
    getAuthorizationCodeExpirationEpoch,
    formatPostOfficeExpiryDate,
} from "../../../utils/DateTimeUtils";
import { ISessionItem } from "../../../models/ISessionItem";

const mockDateObject = new Date("2023-02-09T15:00:00.652Z");
vi.spyOn(Date, "now").mockImplementation(() => mockDateObject.getTime());

describe("getAuthorizationCodeExpirationEpoch", () => {
	it("should validate return a valid time in epoch after 10 secs when TTL is set", () => {
		const res = getAuthorizationCodeExpirationEpoch("10");
		expect(res).toBe(1675954810652);
	});

	it("should validate return a valid time in epoch after 10 mins when TTL is not set", () => {
		const res = getAuthorizationCodeExpirationEpoch("");
		expect(res).toBe(1675955400652);
	});
});

function getMockSessionItem(dateInSeconds: number): ISessionItem {
    const sessionInfo: ISessionItem = {
        sessionId: "RandomF2FSessionID",
        clientId: "ipv-core-stub",
        // pragma: allowlist nextline secret
        accessToken: "AbCdEf123456",
        clientSessionId: "sdfssg",
        authorizationCode: "",
        authorizationCodeExpiryDate: 0,
        redirectUri: "http://localhost:8085/callback",
        accessTokenExpiryDate: 0,
        expiryDate: 221848913376,
        createdDate: dateInSeconds,
        state: "Y@atr",
        subject: "sub",
        persistentSessionId: "sdgsdg",
        clientIpAddress: "127.0.0.1",
        attemptCount: 1,
        authSessionState: AuthSessionState.F2F_SESSION_CREATED,
    };
    return sessionInfo;
}

describe("formatPostOfficeExpiryDate", () => {
    it.each([
        ["2026-09-03", "18 September"], // 3 September => 18 September
        ["2026-01-28", "12 February"], // 30 January => 12 February
        ["2026-12-20", "4 January"], // 20 December => 4 January
    ])(
        "should provide a date in English that is 15 days from %s when the locale is set to English",
        (dateString: string, expected: string) => {
            const testDate = new Date(dateString);
            const sessionItem = getMockSessionItem(
                Math.floor(testDate.getTime() / 1000),
            );

            const expiryDate = formatPostOfficeExpiryDate(sessionItem, "en-GB");

            expect(expiryDate).toBe(expected);
        },
    );
    it.each([
        ["2026-09-03", "Medi 18"], // 3 September => Medi 18 (September)
        ["2026-01-28", "Chwefror 12"], // 30 January => Chwefor 12 (February)
        ["2026-12-20", "Ionawr 4"], // 20 December => Ionawr 4 (January)
    ])(
        "should provide a date in Welsh that is 15 days from %s when the locale is set to Welsh",
        (dateString: string, expected: string) => {
            const testDate = new Date(dateString);
            const sessionItem = getMockSessionItem(
                Math.floor(testDate.getTime() / 1000),
            );

            const expiryDate = formatPostOfficeExpiryDate(sessionItem, "cy-GB");

            expect(expiryDate).toBe(expected);
        },
    );
});
