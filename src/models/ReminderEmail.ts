import { IsString, IsNotEmpty, IsEmail } from "class-validator";
import { randomUUID } from "crypto";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "./enums/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";

/**
 * Object to represent data contained in email messages sent by this lambda
 */
export class ReminderEmail {

	constructor(data: Partial<ReminderEmail>) {
		this.sessionId = data.sessionId!;
		this.emailAddress = data.emailAddress!;
		this.yotiSessionId = data.yotiSessionId!;
		this.referenceId = randomUUID();
	}

	static parseRequest(data: any, logger: Logger): ReminderEmail {
		try {
			return new ReminderEmail(JSON.parse(data));
			// ignored so as not log PII
			/* eslint-disable @typescript-eslint/no-unused-vars */
		} catch (error: any) {
			logger.error("Cannot parse ReminderEmail data");
			throw new AppError( HttpCodesEnum.BAD_REQUEST, "Cannot parse ReminderEmail data");
		}
	}

	@IsString()
	@IsNotEmpty()
	sessionId!: string;

	@IsString()
	@IsNotEmpty()
	@IsEmail()
	emailAddress!: string;

	@IsString()
	@IsNotEmpty()
	yotiSessionId!: string;

	@IsString()
	@IsNotEmpty()
	referenceId!: string;

}
