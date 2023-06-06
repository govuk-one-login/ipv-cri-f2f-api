import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";

/**
 * Class to map error received from Gov Notify service to App Error object
 */
export class GovNotifyErrorMapper {

	/**
	 * Method that takes an error raised by SendEmailService and translates the error into an AppError with lambda specific AppCode
	 *
	 * @param govNotifyError
	 */
	map(_statusCode: number, errMessage: string): AppError {
		const statusCode: number = _statusCode || HttpCodesEnum.SERVER_ERROR;
		const shouldRetry = (_statusCode === 500 || _statusCode === 429) ? true : false;
		return new AppError(statusCode, errMessage, { shouldRetry });
	}
}
