// @ts-ignore
import _ from "lodash";

/**
 * Class to contain all App Codes used by this lambda
 */
export class AppCodes {

    static readonly GOVAPI_RATE_LIMIT = "rate limit";

    static readonly GOVAPI_SEND_LIMITS = "send limits";

    // pragma: allowlist nextline secret
    static readonly GOVAPI_INC_API_KEY = "API key not found";

    static readonly GOVAPI_SYSTEM_CLOCK = "system clock";

    static readonly GOVAPI_TRIAL_MODE = "trial mode";

    static readonly GOVAPI_TEAM_ONLY = "team-only API key";

    // pragma: allowlist nextline secret
    static readonly GOVAPI_INCORRECT_DATA_TYPE_API_KEY = "service id is not the right data type";

    constructor(public code: string, public message = "", public subStringArray: string[] = []) {
    }

    static format = (msg: string): string => {
    	return "Calling Gov API - ".concat(msg);
    };

    readonly shouldThrow = _.isEmpty(this.subStringArray) || !_.isNil(_.find(this.subStringArray, (e: string) => e !== AppCodes.GOVAPI_RATE_LIMIT));

    static readonly E5202 = new AppCodes("E5202_NOTIFY", AppCodes.format("Endpoint has had an Internal Server Error"));

    static readonly E5210 = new AppCodes("E5210_NOTIFY", AppCodes.format("Clock is out of sync with endpoint"), [AppCodes.GOVAPI_SYSTEM_CLOCK]);

    static readonly E6101 = new AppCodes("E6101_NOTIFY", AppCodes.format("Exceeded daily limit"), [AppCodes.GOVAPI_SEND_LIMITS]);

    static readonly E7307 = new AppCodes("E7307_NOTIFY", "Misconfigured external API's key");

    static readonly E7408 = new AppCodes("E7408_NOTIFY", AppCodes.format("Using Trial Mode"), [AppCodes.GOVAPI_TRIAL_MODE]);

    static readonly E7409 = new AppCodes("E7409_NOTIFY", AppCodes.format("Using team-only API key"), [AppCodes.GOVAPI_TEAM_ONLY]);

    static readonly E8306 = new AppCodes("E8306_NOTIFY", AppCodes.format("Using incorrect API key"), [AppCodes.GOVAPI_INC_API_KEY, AppCodes.GOVAPI_INCORRECT_DATA_TYPE_API_KEY]);

    static readonly E9511 = new AppCodes("E9511_NOTIFY", AppCodes.format("Unexpected bad data rejection"));

    static readonly W4101 = new AppCodes("W4101_NOTIFY", AppCodes.format("Requested to back off"), [AppCodes.GOVAPI_RATE_LIMIT]);

}
