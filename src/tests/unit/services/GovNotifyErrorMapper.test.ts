import { GovNotifyErrorMapper } from "../../../services/GovNotifyErrorMapper";

const govNotifyErrorMapper = new GovNotifyErrorMapper();

describe("GovNotifyErrorMapper", () => {

    beforeAll(() => {
        jest.clearAllMocks();
    });

    beforeEach(() => {
        jest.resetAllMocks();

    });

    it("ShouldThrow to result into false if statusCode is 403", () => {
        const err = {
            "errors": [
                {
                    "error": "AuthError",
                    "message": "Error: Your system clock must be accurate to within 30 seconds",
                },
            ],
            "status_code": 403,
        };
        const appError: any = govNotifyErrorMapper.map(err.status_code, err.errors[0].message);
        expect(appError.statusCode).toBe(403);
        expect(appError.obj.shouldRetry).toBe(false);
    });

    it("ShouldThrow to result into false if statusCode is 429", () => {
        const err = {
            "errors": [
                {
                    "error": "TooManyRequestsError",
                    "message": "Exceeded send limits (LIMIT NUMBER) for today",
                },
            ],
            "status_code": 429,
        };
        const appError: any = govNotifyErrorMapper.map(err.status_code, err.errors[0].message);
        expect(appError.statusCode).toBe(429);
        expect(appError.obj.shouldRetry).toBe(true);
    });

    it("ShouldThrow to result into true if statusCode is 500", () => {
        const err = {
            "errors": [
                {
                    "error": "Exception",
                    "message": "Internal server error",
                },
            ],
            "status_code": 500,
        };
        const appError: any = govNotifyErrorMapper.map(err.status_code, err.errors[0].message);
        expect(appError.statusCode).toBe(500);
        expect(appError.obj.shouldRetry).toBe(true);
    });

});