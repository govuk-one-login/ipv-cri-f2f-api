import { mock } from "vitest-mock-extended";
import { lambdaHandler } from "../../SendToGovNotifyHandler";
import { SendToGovNotifyProcessor } from "../../services/SendToGovNotifyProcessor";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { CONTEXT } from "./data/context";

const mockedSendToGovNotifyProcessor = mock<SendToGovNotifyProcessor>();
const mockGetParameter = vi.hoisted(() => vi.fn());

vi.mock("../../services/SendToGovNotifyProcessor", () => {
	return {
		SendToGovNotifyProcessor: vi.fn(() => mockedSendToGovNotifyProcessor),
	};
});

vi.mock("../../utils/Config", () => {
	return {
		getParameter: mockGetParameter,
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
	beforeEach(() => {
		mockGetParameter.mockResolvedValue("KEY");
	});

	it("successfully calls the SendToGovNotifyProcessor with incoming event", async () => {
        
		SendToGovNotifyProcessor.getInstance = vi.fn().mockReturnValue(mockedSendToGovNotifyProcessor);
		await lambdaHandler(event, CONTEXT);

		 
		expect(mockedSendToGovNotifyProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("errors when SendToGovNotifyProcessor throws AppError", async () => {
		SendToGovNotifyProcessor.getInstance = vi.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "sendYotiInstructions - Cannot send Email");
		});

		await expect(lambdaHandler("any", CONTEXT)).rejects.toThrow("Email could not be sent. Returning failed message");
	});

	it("errors when there is a failure to fetch GOVUKNOTIFY_API_KEY from SSM", async () => {
		mockGetParameter.mockRejectedValue(new Error("Parameter not found"));
		await expect(lambdaHandler("any", CONTEXT)).rejects.toThrow("Email could not be sent. Returning failed message");
	});
});
