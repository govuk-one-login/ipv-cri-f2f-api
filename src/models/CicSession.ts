import { IsISO8601, IsNotEmpty, IsString } from "class-validator";
import { ICicSession } from "./ISessionItem";

export class CicSession implements ICicSession {
	constructor(data: CicSession) {
		this.full_name = data.full_name!;
		this.date_of_birth = data.date_of_birth!;
		this.document_selected = data.document_selected!;
		this.date_of_expiry = data.date_of_expiry!;
	}

  @IsString()
  @IsNotEmpty()
  full_name: string;

  @IsISO8601()
  @IsNotEmpty()
  date_of_birth: string;

  @IsString()
  @IsNotEmpty()
  document_selected: string;

  @IsISO8601()
  @IsNotEmpty()
  date_of_expiry: string;
}
