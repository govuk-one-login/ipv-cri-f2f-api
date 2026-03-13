import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { YotiCallbackPayload } from "../../type/YotiCallbackPayload";
import { AppError } from "../../utils/AppError";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { F2fService } from "../F2fService";

type SessionLookupOptions = {
	f2fService: F2fService;
	logger: Logger;
	yotiSessionID: string;
	notFoundStatusCode?: HttpCodesEnum;
	notFoundErrorMessage?: string;
	notFoundLogMessage?: string;
	notFoundMessageCode?: MessageCodes;
	onLookupError?: (error: any) => void;
	onNotFound?: () => void;
	appendLogKeys?: boolean;
};

export class CallbackSessionHelper {
	static getYotiSessionIdOrThrow(
		eventBody: YotiCallbackPayload,
		logger: Logger,
		logMessage: string,
		messageCode: MessageCodes,
		statusCode: HttpCodesEnum,
		errorMessage: string,
	): string {
		const yotiSessionID = eventBody.session_id;
		if (!yotiSessionID) {
			logger.error(logMessage, { messageCode });
			throw new AppError(statusCode, errorMessage);
		}
		return yotiSessionID;
	}

	static appendSessionKeys(logger: Logger, f2fSession: any): void {
		logger.appendKeys({
			sessionId: f2fSession.sessionId,
			govuk_signin_journey_id: f2fSession.clientSessionId,
		});
	}

	static async getSessionByYotiIdOrThrow(options: SessionLookupOptions): Promise<any> {
		const {
			f2fService,
			logger,
			yotiSessionID,
			notFoundStatusCode = HttpCodesEnum.SERVER_ERROR,
			notFoundErrorMessage = "Missing Info in Session Table",
			notFoundLogMessage = "Session not found",
			notFoundMessageCode = MessageCodes.SESSION_NOT_FOUND,
			onLookupError,
			onNotFound,
			appendLogKeys = true,
		} = options;

		logger.info("Fetching F2F Session info with Yoti SessionID", { yotiSessionID });

		let f2fSession;
		try {
			f2fSession = await f2fService.getSessionByYotiId(yotiSessionID);
		} catch (error: any) {
			onLookupError?.(error);
			throw error;
		}

		if (!f2fSession) {
			logger.error(notFoundLogMessage, { messageCode: notFoundMessageCode });
			onNotFound?.();
			throw new AppError(notFoundStatusCode, notFoundErrorMessage);
		}

		if (appendLogKeys) {
			this.appendSessionKeys(logger, f2fSession);
		}

		return f2fSession;
	}
}
