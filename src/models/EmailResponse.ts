import { EmailStatusEnum } from "./enums/EmailStatusEnum";

/**
 * Class to represent outcome of sending email through AWS SES or Gov Notify services
 * If sending was unsuccessful email status is set to NOT SENT and failure message field is populated
 * If sending in successful email failure message is set to an empty string
 */

export class EmailResponse {
	constructor(public emailSentDateTime: string,
		public emailFailureMessage: string,
		public emailStatus: EmailStatusEnum,
		public metadata: any) {

		if (this.emailStatus === EmailStatusEnum.SENT) {
			this.emailFailureMessage = "";
		}
	}
}
