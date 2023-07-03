import { IsString, IsNotEmpty, IsOptional, IsEmail } from "class-validator";
import { randomUUID } from "crypto";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "./enums/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";

/**
 * Object to represent data contained in email messages sent by this lambda
 */
export class Email {

	constructor(data: Partial<Email>) {
		this.sessionId = data.sessionId!;
		this.yotiSessionId = data.yotiSessionId!;
		this.emailAddress = data.emailAddress!;
		this.firstName = data.firstName!;
		this.lastName = data.lastName!;
		this.referenceId = randomUUID();
	}

	static parseRequest(data: any, logger: Logger): Email {
		try {

			const obj = JSON.parse(data);
			return new Email(obj);
		} catch (error: any) {
			logger.error("Cannot parse Email data");
			throw new AppError( HttpCodesEnum.BAD_REQUEST, "Cannot parse Email data");
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
    referenceId!: string;

}
