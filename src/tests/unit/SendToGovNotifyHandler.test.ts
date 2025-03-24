import { mock } from "jest-mock-extended";
import { lambdaHandler } from "../../SendToGovNotifyHandler";
import { SendToGovNotifyProcessor } from "../../services/SendToGovNotifyProcessor";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { CONTEXT } from "./data/context";

const mockedSendToGovNotifyProcessor = mock<SendToGovNotifyProcessor>();
jest.mock("../../services/SendToGovNotifyProcessor", () => {
	return {
		SendToGovNotifyProcessor: jest.fn(() => mockedSendToGovNotifyProcessor),
	};
});

jest.mock("../../utils/Config", () => {
	return {
		getParameter: jest.fn().mockResolvedValue("KEY"),
	};
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
		"postalCode": "BA2 5AA",
		"addressCountry": "GB",
		"preferredAddress": true,
	},  
};

describe("GovNotifyHandler", () => {
	it("successfully calls the SendToGovNotifyProcessor with incoming event", async () => {
        
		SendToGovNotifyProcessor.getInstance = jest.fn().mockReturnValue(mockedSendToGovNotifyProcessor);
		await lambdaHandler(event, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedSendToGovNotifyProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("errors when SendToGovNotifyProcessor throws AppError", async () => {
		SendToGovNotifyProcessor.getInstance = jest.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendYotiInstructions - Cannot send Email");
		});

		await expect(lambdaHandler("any", CONTEXT)).rejects.toThrow("Email could not be sent. Returning failed message");
	});

	it("errors when there is a failure to fetch GOVUKNOTIFY_API_KEY from SSM", async () => {
		jest.mock("../../utils/Config", () => {
			return {
				getParameter: jest.fn().mockRejectedValue(new Error("Parameter not found")),
			};
		});	
		await expect(lambdaHandler("any", CONTEXT)).rejects.toThrow("Email could not be sent. Returning failed message");
	});
});
