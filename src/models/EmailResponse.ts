export class EmailResponse {
	constructor(public emailSentDateTime: string,
		public emailFailureMessage: string,
		public metadata: any,
		public id: string) { }
}
