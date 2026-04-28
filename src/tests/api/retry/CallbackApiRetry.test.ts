 
import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import vcResponseData from "../../data/vcValidationData.json";
import {
	startStubServiceAndReturnSessionId,
	validateJwtToken,
	getDequeuedSqsMessage,
	initiateUserInfo,
	getSessionById,
	callbackPost,
} from "../ApiTestSteps";
import "dotenv/config";
import { constants } from "../ApiConstants";
import { YotiCallbackTopics } from "../../../models/enums/YotiCallbackTopics";
import { sleep } from "../../../utils/Sleep";

//QualityGateIntegrationTest 
//QualityGateStackTest
describe("/callback endpoint", () => {
	it("F2F CRI Callback Endpoint - Verified Credential validation for yotiMockId: 1601 - documentType: UkDrivingLicence with retry", async () => {
		const yotiMockId = "1601";
		f2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId, sub } = await startStubServiceAndReturnSessionId(f2fStubPayload);
		await initiateUserInfo(dataUkDrivingLicence, sessionId);
		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
		await callbackPost(yotiSessionId, YotiCallbackTopics.FIRST_BRANCH_VISIT, 202);
		await sleep(5000)
		await callbackPost(yotiSessionId, YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED, 202);
		await sleep(5000)
		await callbackPost(yotiSessionId, YotiCallbackTopics.SESSION_COMPLETION, 202);
		await sleep(5000)
		
		let sqsMessage;
		let i = 0;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
			i++;
		} while (i < 10 && !sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		await validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	}, 60000);
});
