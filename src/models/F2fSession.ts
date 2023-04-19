import {
	ArrayNotEmpty,
	IsArray,
	IsISO8601,
	IsNotEmpty,
} from "class-validator";
import { IF2fSession } from "./ISessionItem";

export class F2fSession implements IF2fSession {
	constructor(data: F2fSession) {
		this.given_names = data.given_names!;
		this.family_names = data.family_names!;
		this.date_of_birth = data.date_of_birth!;
	}

  @IsArray()
  @ArrayNotEmpty()
  given_names: string[];

  @IsISO8601()
  @IsNotEmpty()
  date_of_birth: string;

  @IsArray()
  @ArrayNotEmpty()
  family_names: string[];
}
