
import {randomUUID} from "crypto";
export class YotiSessionItem {

	constructor() {
		this.session_id = randomUUID();
		this.client_session_token_ttl = 599;
		this.client_session_token = randomUUID();
	}

	session_id: string;
	client_session_token_ttl: number;
	client_session_token: string;

	protected getSessionId() {
		return this.session_id;
	}
}
