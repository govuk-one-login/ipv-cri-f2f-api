import { IsString, IsNotEmpty, IsEmail } from "class-validator";
import { randomUUID } from "crypto";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "./enums/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";

/**
 * Object to represent data contained in email messages sent by this lambda
 */
export class DynamicReminderEmail {

	constructor(data: Partial<DynamicReminderEmail>) {
		this.sessionId = data.sessionId!;
		this.yotiSessionId = data.yotiSessionId!;
		this.emailAddress = data.emailAddress!;
		this.firstName = data.firstName!;
		this.lastName = data.lastName!;
		this.documentUsed = data.documentUsed!;
		this.referenceId = randomUUID();
	}

	static parseRequest(data: any, logger: Logger): DynamicReminderEmail {
		try {
			return new DynamicReminderEmail(JSON.parse(data));
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
    yotiSessionId!: string;

	@IsString()
	@IsNotEmpty()
	@IsEmail()
	emailAddress!: string;

	@IsString()
    @IsNotEmpty()
    firstName!: string;

	@IsString()
	@IsNotEmpty()
	lastName!: string;

	@IsString()
	@IsNotEmpty()
	documentUsed!: string;

	@IsString()
	@IsNotEmpty()
	referenceId!: string;

}
