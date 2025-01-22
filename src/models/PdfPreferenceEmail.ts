import { IsString, IsNotEmpty, IsEmail } from "class-validator";

import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "./enums/HttpCodesEnum";
import { Logger } from "@aws-lambda-powertools/logger";
import { randomUUID } from "crypto";

/**
 * Object to represent data contained in object sent to SendToGovNotifyHandler as input
 */
export class PdfPreferenceEmail {

	constructor(data: Partial<PdfPreferenceEmail>) {
		if (!data.sessionId) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "sessionId is required");
		}
		if (!data.yotiSessionId) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "yotiSessionId is required");
		}
		if (!data.emailAddress) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "emailAddress is required");
		}
		if (!data.firstName) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "firstName is required");
		}
		if (!data.lastName) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "lastName is required");
		}
		if (!data.pdfPreference) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "pdfPreference is required");
		}
		if (!data.postalAddress) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "postalAddress is required");
		}
	
		this.sessionId = data.sessionId;
		this.yotiSessionId = data.yotiSessionId;
		this.emailAddress = data.emailAddress;
		this.firstName = data.firstName;
		this.lastName = data.lastName;
		this.referenceId = randomUUID();
		this.pdfPreference = data.pdfPreference;
		this.postalAddress = data.postalAddress;
	}
	

	static parseRequest(data: any, logger: Logger): PdfPreferenceEmail {
		try {

			const obj = JSON.parse(data);
			return new PdfPreferenceEmail(obj);
		} catch (error: any) {
			logger.error("Cannot parse PdfPreferenceEmail data");
			throw new AppError( HttpCodesEnum.BAD_REQUEST, "Cannot parse PdfPreferenceEmail data");
		}
	}

	@IsString()
	@IsNotEmpty()
	sessionId: string;

    @IsString()
    @IsNotEmpty()
    yotiSessionId!: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    emailAddress: string;

    @IsString()
    @IsNotEmpty()
    firstName: string;

	@IsString()
	@IsNotEmpty()
	lastName: string;

	@IsString()
    @IsNotEmpty()
    referenceId: string;

	@IsString()
	@IsNotEmpty()
	pdfPreference: string;

	@IsNotEmpty()
	postalAddress: object;

}
