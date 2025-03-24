/* eslint-disable @typescript-eslint/unbound-method */
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { AddressLocationsProcessor } from "../../../services/AddressLocationsProcessor";
import axios from "axios";

const mockF2fService = mock<F2fService>();
jest.mock("axios");

const logger = mock<Logger>();
const metrics = mock<Metrics>();

let addressLocationsProcessor: AddressLocationsProcessor;
const sessionId = "RandomF2FSessionID";

function getMockSessionItem(): ISessionItem {
	const sessionInfo: ISessionItem = {
		sessionId: "RandomF2FSessionID",
		clientId: "ipv-core-stub",
		// pragma: allowlist nextline secret
		accessToken: "AbCdEf123456",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 0,
		redirectUri: "http://localhost:8085/callback",
		accessTokenExpiryDate: 0,
		expiryDate: 221848913376,
		createdDate: 1675443004,
		state: "Y@atr",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

describe("AddressLocationsProcessor", () => {
	let axiosMock: jest.Mocked<typeof axios>;

	beforeAll(() => {
		metrics.singleMetric.mockReturnValue(metrics);
		
		axiosMock = axios as jest.Mocked<typeof axios>;

		addressLocationsProcessor = new AddressLocationsProcessor(logger, metrics, "osAPIKey" );
		// @ts-expect-error linting to be updated
		addressLocationsProcessor.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

		await expect(addressLocationsProcessor.processRequest("undefined", "postcode")).resolves.toEqual(expect.objectContaining({
			statusCode: HttpCodesEnum.UNAUTHORIZED,
			body: "No session found with the session id: undefined",
		}));

		expect(logger.error).toHaveBeenCalledWith("No session found for session id", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
	});

	it("throws error if client config cannot be found", async () => {
		const sessionItem = getMockSessionItem();
		sessionItem.clientId = "not_found";
		mockF2fService.getSessionById.mockResolvedValueOnce(sessionItem);

		await expect(addressLocationsProcessor.processRequest(sessionId, "postcode")).resolves.toEqual(expect.objectContaining({
			statusCode: HttpCodesEnum.BAD_REQUEST,
			body: "Bad Request",
		}));

		expect(logger.error).toHaveBeenCalledWith("Unrecognised client in request", {
			messageCode: MessageCodes.UNRECOGNISED_CLIENT,
		});
	});

	it("throws error if OS returns 400", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		axiosMock.get.mockRejectedValue({ response: { status: 400 } });
		axiosMock.isAxiosError.mockReturnValue(true);

		await expect(addressLocationsProcessor.processRequest(sessionId, "postcode")).rejects.toEqual(expect.objectContaining({
			name: "Error",
			message: "Error retrieving OS locations data",
		}));

		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "400");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "OS_response", MetricUnits.Count, 1);
	});

	it("throws error if OS returns 500", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		axiosMock.get.mockRejectedValue({ response: { status: 500 } });
		axiosMock.isAxiosError.mockReturnValue(true);

		await expect(addressLocationsProcessor.processRequest(sessionId, "postcode")).rejects.toEqual(expect.objectContaining({
			name: "Error",
			message: "Error retrieving OS locations data",
		}));

		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "500");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "OS_response", MetricUnits.Count, 1);
	});

	it("Address successfully retrieved from OS and returned", async () => {
		const f2fSessionItem = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValueOnce(f2fSessionItem);
		axiosMock.get.mockResolvedValue({ status: 200, data: { results: { address: "12 test street" } } });
		const response =  await addressLocationsProcessor.processRequest(sessionId, "postcode");
        
		expect(metrics.addDimension).toHaveBeenCalledWith("status_code", "200");
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "OS_response", MetricUnits.Count, 1);
		expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "OSAddress_success", MetricUnits.Count, 1);

		expect(response.body).toBe("{\"address\":\"12 test street\"}");
	});

});
