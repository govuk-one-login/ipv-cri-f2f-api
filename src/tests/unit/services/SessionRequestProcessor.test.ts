import { SessionRequestProcessor } from "../../../services/DocumentSelectorProcessor";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { VALID_SESSION } from "../data/events";
import { CicService } from "../../../services/YotiService";
import { Response } from "../../../utils/Response";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";

let sessionRequestProcessorTest: SessionRequestProcessor;
const mockCicService = mock<CicService>();
const mockKmsJwtAdapter = mock<KmsJwtAdapter>();

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "CIC",
});
const metrics = new Metrics({ namespace: "CIC" });

const mockPerson = {
	name: [
		{
			nameParts: [
				{
					type: "firstName",
					value: "Jane",
				},
				{
					type: "lastName",
					value: "Doe",
				},
			],
		},
	],
	birthDate: [
		{
			value: "2023-01-01",
		},
	],
	address: [
		{
			uprn: 0,
			organisationName: "N/A",
			departmentName: "N/A",
			subBuildingName: "N/A",
			buildingNumber: "1",
			buildingName: "N/A",
			dependentStreetName: "N/A",
			streetName: "Test Street",
			doubleDependentAddressLocality: "N/A",
			dependentAddressLocality: "N/A",
			addressLocality: "N/A",
			postalCode: "AA1 1AA",
			addressCountry: "UK",
			validFrom: "2022-01",
			validUntil: "2023-01",
		},
	],
};

const mockEvent = {
	body: JSON.stringify({
		client_id: "test-client-id",
		request: "jwe-request",
	}),
	headers: {
		["x-forwarded-for"]: "test-client-ip-address",
	},
};

const parsedJwt = {
	header: { kid: "ipv-core-stub-2-from-mkjwk.org", alg: "ES256" },
	payload: {
		sub: "urn:fdc:gov.uk:2022:45ea14b8-d8aa-435b-9eb4-dc091f72adb3",
		shared_claims: {
			name: [Array],
			birthDate: [Array],
			address: [Array],
		},
		iss: "https://di-ipv-core-stub.london.cloudapps.digital",
		persistent_session_id: "00840f7e-5059-404a-a245-8a4c66913d8e",
		response_type: "code",
		client_id: "ipv-core-stub",
		govuk_signin_journey_id: "f41fc24e-0af9-4007-bc09-adae005e4d4f",
		aud: "https://review-c.dev.account.gov.uk",
		nbf: 1677796697,
		scope: "openid",
		redirect_uri: "http://localhost:8085/callback",
		state: "9TNeUH8VqYFBpl7tP0I3kQlkyWXFyTtxC_SRD5mcdKI",
		exp: 2372111069,
		iat: 1677796697,
	},
	signature: "D3xEciukM-rtTmV2svwKapoedVw_1_AZW3PQh4OWpWhYq_Jh9Fc7PYEDN7Snb0p2IXd-nnkxBtQiiePMMke-mA",
};

describe("SessionRequestProcessor", () => {
	beforeAll(() => {
		sessionRequestProcessorTest = new SessionRequestProcessor(logger, metrics);
		// @ts-ignore
		sessionRequestProcessorTest.kmsDecryptor = mockKmsJwtAdapter;
		// @ts-ignore
		sessionRequestProcessorTest.cicService = mockCicService;
		// @ts-ignore
		sessionRequestProcessorTest.logger = logger;
		
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("Return 200 if all checks pass", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValueOnce("urlEncodedJwt");
		mockKmsJwtAdapter.decode.mockReturnValueOnce(parsedJwt);
		const response: Response = await sessionRequestProcessorTest.processRequest(VALID_SESSION);
		
		expect(response.statusCode).toBe(HttpCodesEnum.OK);
	});

	it("Return 401 Unauthorised if Encoded JWT can not be Decrypted", async () => {
		mockKmsJwtAdapter.decrypt.mockRejectedValueOnce("Failed to Decrypt");
		const response: Response = await sessionRequestProcessorTest.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.UNAUTHORIZED);
		expect(response.body).toBe(JSON.stringify({
			redirect: null,
			message: "Invalid request: Request failed to be decrypted",
		}));
	});

	it("Return Server Error if error when saying Session in Dynamo", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValueOnce("urlEncodedJwt");
		mockKmsJwtAdapter.decode.mockReturnValueOnce(parsedJwt);
		mockCicService.createAuthSession.mockRejectedValueOnce("Failed to create session in Dynamo");
		const response: Response = await sessionRequestProcessorTest.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(response.body).toBe("Internal server error");
	});

	it("Return Server Error if error when saying person identity in Dynamo", async () => {
		mockKmsJwtAdapter.decrypt.mockResolvedValueOnce("urlEncodedJwt");
		mockKmsJwtAdapter.decode.mockReturnValueOnce(parsedJwt);
		mockCicService.savePersonIdentity.mockRejectedValueOnce("Failed to save identity information in Dynamo");
		const response: Response = await sessionRequestProcessorTest.processRequest(VALID_SESSION);

		expect(response.statusCode).toBe(HttpCodesEnum.SERVER_ERROR);
		expect(response.body).toBe("Internal server error");
	});


});
