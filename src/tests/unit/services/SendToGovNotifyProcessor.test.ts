import { Logger } from "@aws-lambda-powertools/logger";
import { SendToGovNotifyService } from "../../../services/SendToGovNotifyService";
import { PdfPreferenceEmail } from "../../../models/PdfPreferenceEmail";
import { EmailResponse } from "../../../models/EmailResponse";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AppError } from "../../../utils/AppError";
import { SendToGovNotifyProcessor } from "../../../services/SendToGovNotifyProcessor";
import { mock } from "jest-mock-extended";


let sendToGovNotifyProcessor: SendToGovNotifyProcessor;
const mockSendToGovNotifyService = mock<SendToGovNotifyService>();
const mockValidationHelper = mock<ValidationHelper>();
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});


const event = {
	"sessionId": "24a61cb9-5930-46e1-8913-588c135431fb",
	"yotiSessionId": "7800a068-004f-4630-a079-e63691bd0000",
	"emailAddress": "george.dainton@digital.cabinet-office.gov.uk",
	"firstName": "George",
	"lastName": "Test0000",
	"pdfPreference": "PRINTED_LETTER",
	"postalAddress": {
		"uprn": 123456787,
		"subBuildingName": "Flat 20",
		"buildingNumber": "32",
		"buildingName": "London",
		"streetName": "Demo",
		"addressLocality": "London",
		"postalCode": "SW19",
		"addressCountry": "GB",
		"preferredAddress": true,
	},  
};

const invalidEvent = {
	"sessionId": "24a61cb9-5930-46e1-8913-588c135431fb",
	"yotiSessionId": undefined, 
};


describe("SendToGovNotify processor", () => {
	beforeAll(() => {
		// @ts-ignore
		sendToGovNotifyProcessor = SendToGovNotifyProcessor.getInstance(logger, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-ignore
		sendToGovNotifyProcessor.sendToGovNotifyService = mockSendToGovNotifyService;
		// @ts-ignore
		sendToGovNotifyProcessor.validationHelper = mockValidationHelper;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("successfully calls the SendToGovNotifyService with incoming event", async () => {
		await sendToGovNotifyProcessor.processRequest(event);
	
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockSendToGovNotifyService.sendYotiInstructions).toHaveBeenCalledTimes(1);
	});

	it("fails validation and throws AppError when PdfPreferenceEmail is invalid", async () => {
		await expect(sendToGovNotifyProcessor.processRequest(invalidEvent)).rejects.toThrow("sendYotiInstructions - Cannot send Email");
	});

	it("throws an error if the event does not pass the PdfPreference model validation", async () => {
		mockValidationHelper.validateModel.mockRejectedValue(new AppError(HttpCodesEnum.UNPROCESSABLE_ENTITY, "Failed to Validate" ));

		await expect(sendToGovNotifyProcessor.processRequest(event)).rejects.toThrow("sendYotiInstructions - Cannot send Email");
	});

});
