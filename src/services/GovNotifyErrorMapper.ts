import { AppCodes } from "../models/AppCodes";
// @ts-ignore
import { find } from "lodash";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";

/**
 * Class to map error received from Gov Notify service to App Error object
 */
export class GovNotifyErrorMapper {

    private static readonly errorCodeMap = new Map<number, AppCodes[]>([
    	[ 400, [ AppCodes.E7408, AppCodes.E7409, AppCodes.E9511 ] ],
    	[ 403, [ AppCodes.E8306, AppCodes.E5210, AppCodes.E9511 ] ],
    	[ 429, [ AppCodes.W4101, AppCodes.E6101, AppCodes.E9511 ] ],
    	[ 500, [ AppCodes.E5202] ],
    ]);

    /**
     * Method that takes an error raised by SendEmailService and translates the error into an AppError with lambda specific AppCode
     *
     * @param govNotifyError
     */
    map(govNotifyError: any): AppError {
    	const statusCode: number = govNotifyError.error?.status_code || HttpCodesEnum.SERVER_ERROR;
    	const message: string    = govNotifyError.error?.errors[0].message || "Code error";
    	const appCode = find(GovNotifyErrorMapper.errorCodeMap.get(statusCode), (el: string) => el.match(message) );
    	const shouldThrow = appCode?.shouldThrow;
    	return new AppError(statusCode, appCode?.message!, { shouldThrow });
    }
}
