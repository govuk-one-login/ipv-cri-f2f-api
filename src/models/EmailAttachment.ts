import { IsNotEmpty, IsString } from "class-validator";

/**
 * Class to describe data to be sent as email attachments
 */
export class EmailAttachment {

	constructor(data: Partial<EmailAttachment>) {
		this.cid = data.cid!;
		this.fileName = data.fileName!;
		this.fileBody = data.fileBody!;
		this.fileType = data.fileType!;
	}

    @IsString()
    @IsNotEmpty()
    cid!: string;

    @IsString()
    @IsNotEmpty()
    fileName!: string;

    @IsString()
    @IsNotEmpty()
    fileBody!: string;

    @IsString()
    @IsNotEmpty()
    fileType!: string;
}
