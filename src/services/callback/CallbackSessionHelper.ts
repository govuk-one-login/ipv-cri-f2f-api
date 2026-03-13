import { Logger } from "@aws-lambda-powertools/logger";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { YotiCallbackPayload } from "../../type/YotiCallbackPayload";
import { AppError } from "../../utils/AppError";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { F2fService } from "../F2fService";
import { ValidationHelper } from "../../utils/ValidationHelper";
import { Constants } from "../../utils/Constants";

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

type SessionContextOptions = {
	eventBody: YotiCallbackPayload;
	logger: Logger;
	f2fService: F2fService;
	missingSessionLogMessage: string;
	missingSessionMessageCode: MessageCodes;
	missingSessionStatusCode: HttpCodesEnum;
	missingSessionErrorMessage: string;
	notFoundStatusCode?: HttpCodesEnum;
	notFoundErrorMessage?: string;
	notFoundLogMessage?: string;
	notFoundMessageCode?: MessageCodes;
	onLookupError?: (error: any) => void;
	onNotFound?: () => void;
	appendLogKeys?: boolean;
};

export class CallbackSessionHelper {
	static throwIfMissingRequiredYotiVars(validationHelper: ValidationHelper): void {
		if (!validationHelper.checkRequiredYotiVars()) {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}
	}

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

	static async getSessionContextOrThrow(options: SessionContextOptions): Promise<{ yotiSessionID: string; f2fSession: any }> {
		const {
			eventBody,
			logger,
			f2fService,
			missingSessionLogMessage,
			missingSessionMessageCode,
			missingSessionStatusCode,
			missingSessionErrorMessage,
			notFoundStatusCode,
			notFoundErrorMessage,
			notFoundLogMessage,
			notFoundMessageCode,
			onLookupError,
			onNotFound,
			appendLogKeys,
		} = options;

		const yotiSessionID = this.getYotiSessionIdOrThrow(
			eventBody,
			logger,
			missingSessionLogMessage,
			missingSessionMessageCode,
			missingSessionStatusCode,
			missingSessionErrorMessage,
		);

		const f2fSession = await this.getSessionByYotiIdOrThrow({
			f2fService,
			logger,
			yotiSessionID,
			notFoundStatusCode,
			notFoundErrorMessage,
			notFoundLogMessage,
			notFoundMessageCode,
			onLookupError,
			onNotFound,
			appendLogKeys,
		});

		return { yotiSessionID, f2fSession };
	}
}
