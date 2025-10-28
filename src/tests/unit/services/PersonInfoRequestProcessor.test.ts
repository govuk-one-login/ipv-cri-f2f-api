 
 
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";
import NodeRSA from "node-rsa";
import { HttpCodesEnum } from "../../../models/enums/HttpCodesEnum";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { ISessionItem } from "../../../models/ISessionItem";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { F2fService } from "../../../services/F2fService";
import { PersonInfoRequestProcessor } from "../../../services/PersonInfoRequestProcessor";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";

const encryptMock = jest.fn();
jest.mock("node-rsa", () => {
	return jest.fn().mockImplementation(() => ({
		encrypt: encryptMock,
	}));
});

let personInfoRequestProcessorTest: PersonInfoRequestProcessor;
const mockF2fService = mock<F2fService>();

const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });
const PRIVATE_KEY_SSM_PARAM = "argadfgadf";
const sessionId = "sessionId";

const person: PersonIdentityItem = {
	"addresses": [
		{
			"addressCountry": "GB",
			"buildingName": "Sherman",
			"subBuildingName": "Flat 5",
			"uprn": 123456789,
			"streetName": "Wallaby Way",
			"postalCode": "F1 1SH",
			"buildingNumber": "32",
			"addressLocality": "Sidney",
			"preferredAddress": true,
		},
	],
	"sessionId": "RandomF2FSessionID",
	"emailAddress": "viveak.vadivelkarasan@digital.cabinet-office.gov.uk",
	"birthDate": [
		{
			"value":"1960-02-02",
		},
	],
	"name": [
		{
			"nameParts": [
				{
					"type": "GivenName",
					"value": "Frederick",
				},
				{
					"type": "GivenName",
					"value": "Joseph",
				},
				{
					"type": "FamilyName",
					"value": "Flintstone",
				},
			],
		},
	],
	expiryDate: 1612345678,
	createdDate: 1612335678,
};

function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
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
		authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
		yotiSessionId: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
	};
	return sess;
}

describe("PersonInfoRequestProcessor", () => {
	beforeAll(() => {
		personInfoRequestProcessorTest = new PersonInfoRequestProcessor(logger, metrics, PRIVATE_KEY_SSM_PARAM);
		// @ts-expect-error linting to be updated
		personInfoRequestProcessorTest.f2fService = mockF2fService;
	});

	describe("#processRequest", () => {
		it("returns error response if person identity cannot be found", async () => {
			const sess = getMockSessionItem();
			mockF2fService.getSessionById.mockResolvedValueOnce(sess);
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(undefined);

			const response = await personInfoRequestProcessorTest.processRequest(sessionId);

			expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
			expect(response.body).toBe(`No person found with the session id: ${sessionId}`);
			expect(logger.error).toHaveBeenCalledWith("No person found for session id", {
				messageCode: MessageCodes.PERSON_NOT_FOUND,
			});
		});

		it("returns error response if session cannot be found", async () => {
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(person);
			mockF2fService.getSessionById.mockResolvedValueOnce(undefined);

			const response = await personInfoRequestProcessorTest.processRequest(sessionId);

			expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
			expect(response.body).toBe(`No session found with the session id: ${sessionId}`);
			expect(logger.error).toHaveBeenCalledWith("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
		});

		it("returns succesfull response with encrypted name", async () => {
			mockF2fService.getPersonIdentityById.mockResolvedValueOnce(person);
			const sess = getMockSessionItem();
			mockF2fService.getSessionById.mockResolvedValueOnce(sess);
			const encryptSpy = jest.spyOn(personInfoRequestProcessorTest, "encryptResponse").mockReturnValueOnce("Encrypted name");

			const response = await personInfoRequestProcessorTest.processRequest(sessionId);

			expect(response.statusCode).toBe(HttpCodesEnum.OK);
			expect(encryptSpy).toHaveBeenCalledWith({ address_line1: "Flat 5 Sherman", address_line2: "32 Wallaby Way", town_city: "Sidney", postal_code: "F1 1SH" });
			expect(response.body).toBe("Encrypted name");
		});
	});

	describe("#encryptResponse", () => {
		it("encrypts data with public key and returns it", () => {
			const data = { address_line1: "Flat 5 Sherman", address_line2: "32 Wallaby Way", town_city: "Sidney", postal_code: "F1 1SH" };
			encryptMock.mockReturnValueOnce("Encrypted name");

			const result = personInfoRequestProcessorTest.encryptResponse(data);

			expect(NodeRSA).toHaveBeenCalledWith(PRIVATE_KEY_SSM_PARAM);
			expect(encryptMock).toHaveBeenCalledWith(JSON.stringify(data), "base64");
			expect(result).toBe("Encrypted name");
		});
	});
});
