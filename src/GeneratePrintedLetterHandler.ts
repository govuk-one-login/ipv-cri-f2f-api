import { logger } from "@govuk-one-login/cri-logger";
import { metrics, captureMetric } from "@govuk-one-login/cri-metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { Constants } from "./utils/Constants";
import { AppError } from "./utils/AppError";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { MessageCodes } from "./models/enums/MessageCodes";
import { GeneratePrintedLetterProcessor } from "./services/GeneratePrintedLetterProcessor";
import { Response } from "./utils/Response";


export class GeneratePrintedLetterHandler implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: any): Promise<any> {

		logger.resetKeys();
		logger.addContext(context);

		try {
			logger.info("Starting GeneratePrintedLetterProcessor");

			this.validateEvent(event);
			return await GeneratePrintedLetterProcessor.getInstance().processRequest(event);

		} catch (error: any) {
			logger.error({ message: "An error has occurred",
				error,
				messageCode: MessageCodes.SERVER_ERROR,
			});

			captureMetric("GeneratePrintedLetter_error_generating_printed_letter");

			if (error instanceof AppError) {
				return Response(error.statusCode, error.message);
			}
			return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
		}
	}

	validateEvent(event: { sessionId: string; pdfPreference: string }):void {
		if (!event.pdfPreference) {			
			const message = "Invalid request: missing pdfPreference";
			logger.error({ message, messageCode: MessageCodes.MISSING_PCL_PREFERENCE });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		} else if (!event.sessionId) {
			const message = "Invalid request: missing sessionId";
			logger.error({ message, messageCode: MessageCodes.MISSING_SESSION_ID });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		} else if (!Constants.REGEX_UUID.test(event.sessionId)) {
			const message = "Invalid request: sessionId is not a valid uuid";
			logger.error({ message, messageCode: MessageCodes.INVALID_SESSION_ID });
			throw new AppError(HttpCodesEnum.UNAUTHORIZED, message);
		}
	}
}

const handlerClass = new GeneratePrintedLetterHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
