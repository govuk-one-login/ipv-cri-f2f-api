import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, ValidateNested, IsObject } from "class-validator";
import { randomUUID } from "crypto";
import { EmailAttachment } from "./EmailAttachment";
import {AppError} from "../utils/AppError";
import {HttpCodesEnum} from "./enums/HttpCodesEnum";

/**
 * Object to represent data contained in email messages sent by this lambda
 */
export class Email {

    constructor(data: Partial<Email>) {
        this.templateId = data.templateId!;
        this.emailAddress = data.emailAddress!;
        this.subject = data.subject!;
        //this.body = Email.parseBody(data.body!);
        //this.attachments = Email.parseAttachments(data.attachments!);
        this.referenceId = randomUUID();
    }

    static parseRequest(data: any): Email {
        try {
            //data = (data as string).replace(/(?:\\\\')|(?:\\')/g, "'");
            //data = (data as string).replace(/\t/gm, "    ");
            const obj = JSON.parse(data);
            return new Email(obj);
        } catch (error: any) {
            console.log("Cannot parse Email data", Email.name, "parseBody", { data });
            throw new AppError( HttpCodesEnum.BAD_REQUEST,"Cannot parse Email data");
        }
    }


    // private static parseBody(body: any): any {
    //     try {
    //         //body = (body as string).replace(/\t/gm, "    ");
    //         //body = (body as string).replace(/\\t/gm, "    ");
    //         const b = JSON.parse(body);
    //         return b;
    //     } catch (error: any) {
    //         console.log("Invalid Email Body format", Email.name, "parseBody", body);
    //         throw new AppError(HttpCodesEnum.BAD_REQUEST,"Invalid Email Body format");
    //     }
    // }


    // private static parseAttachments(attachments: any): EmailAttachment[] {
    //     return attachments ? attachments.map((a: Partial<EmailAttachment>) => new EmailAttachment(a)) : [];
    // }

    @IsString()
    @IsNotEmpty()
    templateId!: string;

    @IsString()
    @IsNotEmpty()
    @IsEmail()
    emailAddress!: string;

    @IsString()
    @IsOptional()
    subject!: string;

    // @IsObject()
    // @IsNotEmpty()
    // body!: { };

    // @IsArray()
    // @ValidateNested()
    // attachments!: EmailAttachment[];

    @IsString()
    @IsNotEmpty()
    referenceId!: string;

}
