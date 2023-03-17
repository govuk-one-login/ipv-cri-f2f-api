export class F2fResponse {

	constructor(data: Partial<F2fResponse>) {
		this.authorizationCode = data.authorizationCode!;
		this.redirect_uri = data.redirect_uri;
		this.state = data.state;
	}

	authorizationCode: { value: string };

	redirect_uri?: string;

	state?: string;
}
