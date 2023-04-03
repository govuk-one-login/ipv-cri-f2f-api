import { IsString, IsNotEmpty, IsOptional, IsEmail } from "class-validator";
import { randomUUID } from "crypto";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "./enums/HttpCodesEnum";

/**
 * Object to represent data contained in email messages sent by this lambda
 */
export class Email {

	constructor(data: Partial<Email>) {
		this.yotiSessionId = data.yotiSessionId!;
		this.emailAddress = data.emailAddress!;
		this.firstName = data.firstName!;
		this.lastName = data.lastName!;
		this.referenceId = randomUUID();
	}

	static parseRequest(data: any): Email {
		try {

			const obj = JSON.parse(data);
			return new Email(obj);
		} catch (error: any) {
			console.log("Cannot parse Email data", Email.name, "parseBody", { data });
			throw new AppError( HttpCodesEnum.BAD_REQUEST, "Cannot parse Email data");
		}
	}

    @IsString()
    @IsNotEmpty()
    yotiSessionId!: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    emailAddress!: string;

    @IsString()
    @IsOptional()
    firstName!: string;

	@IsString()
	@IsOptional()
	lastName!: string;

    @IsString()
    @IsNotEmpty()
    referenceId!: string;

}
