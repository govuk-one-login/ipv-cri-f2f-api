// @ts-ignore
import _ from "lodash";

/**
 * Class to contain all App Codes used by this lambda
 */
export class AppCodes {

    static readonly GOVAPI_RATE_LIMIT = "rate limit";

    static readonly GOVAPI_SEND_LIMITS = "send limits";

    static readonly GOVAPI_INC_API_KEY = "API key not found";

    static readonly GOVAPI_SYSTEM_CLOCK = "system clock";

    static readonly GOVAPI_TRIAL_MODE = "trial mode";

    static readonly GOVAPI_TEAM_ONLY = "team-only API key";

    static readonly GOVAPI_INCORRECT_DATA_TYPE_API_KEY = "service id is not the right data type";

    constructor(public code: string, public message = "", public subStringArray: string[] = []) {
    }

    static format = (msg: string): string => {
    	return "Calling Gov API - ".concat(msg);
    };

    readonly shouldThrow = _.isEmpty(this.subStringArray) || !_.isNil(_.find(this.subStringArray, (e: string) => e !== AppCodes.GOVAPI_RATE_LIMIT));

    // static readonly E1001 = new AppCodes("E1001_GEN", "Error reading template from AWS S3");
    //
    // static readonly E1002 = new AppCodes("E1002_GEN", "Invalid configuration");
    //
    // static readonly E1003 = new AppCodes("E1003_GEN", "Failure occurred when trying to send email through AWS SES");
    //
    // static readonly E1004 = new AppCodes("E1004_GEN", "Template does not correspond to the fields passed in the request");
    //
    // static readonly E1005 = new AppCodes("E1005_GEN", "Template file is empty");
    //
    // static readonly E1006 = new AppCodes("E1006_GEN", "Template file doesn't exist");
    //
    // static readonly E4305 = new AppCodes("E4305_GEN", "Invalid email request details or missing required parameters");

    static readonly E5202 = new AppCodes("E5202_GEN", AppCodes.format("Endpoint has had an Internal Server Error"));

    static readonly E5210 = new AppCodes("E5210_GEN", AppCodes.format("Clock is out of sync with endpoint"), [AppCodes.GOVAPI_SYSTEM_CLOCK]);

    static readonly E6101 = new AppCodes("E6101_GEN", AppCodes.format("Exceeded daily limit"), [AppCodes.GOVAPI_SEND_LIMITS]);

    static readonly E7307 = new AppCodes("E7307_GEN", "Misconfigured external API's key");

    static readonly E7408 = new AppCodes("E7408_GEN", AppCodes.format("Using Trial Mode"), [AppCodes.GOVAPI_TRIAL_MODE]);

    static readonly E7409 = new AppCodes("E7409_GEN", AppCodes.format("Using team-only API key"), [AppCodes.GOVAPI_TEAM_ONLY]);

    static readonly E8306 = new AppCodes("E8306_GEN", AppCodes.format("Using incorrect API key"), [AppCodes.GOVAPI_INC_API_KEY, AppCodes.GOVAPI_INCORRECT_DATA_TYPE_API_KEY]);

    static readonly E9511 = new AppCodes("E9511_GEN", AppCodes.format("Unexpected bad data rejection"));

    // static readonly S0001 = new AppCodes("S0001_GEN", "Sent email successfully");
    //
    // static readonly W0101 = new AppCodes("W0101_GEN", "AppConfig  - Invalid configuration - switching to default");
    //
    // static readonly W0303 = new AppCodes("W0303_GEN", "Misconfigured external API's max number of retry attempts");
    //
    // static readonly W0304 = new AppCodes("W0304_GEN", "Misconfigured external API's back off period");
    //
    // static readonly W0305 = new AppCodes("W0305_GEN", "Email not sent. Email is disabled");
    //
    // static readonly W1506 = new AppCodes("W1506_GEN", "Unexpected no. of records");
    //
    // static readonly W3103 = new AppCodes("W3103_GEN", "Retries exceeded");

    static readonly W4101 = new AppCodes("W4101_GEN", AppCodes.format("Requested to back off"), [AppCodes.GOVAPI_RATE_LIMIT]);

}
