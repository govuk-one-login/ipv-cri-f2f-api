 
import { mock } from "jest-mock-extended";
import { getClientConfig } from "../../../utils/ClientConfig";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AppError } from "../../../utils/AppError";

const clientConfig = '[{"jwksEndpoint":"https://api.identity.account.gov.uk/.well-known/jwks.json","clientId":"test-config","redirectUri":"http://localhost:8085/callback","YotiBaseUrl": "https://XXX-proxy.review-o.dev.account.gov.uk/yoti","GovNotifyApi": "https://test-govnotify-stub"}]';
const logger = mock<Logger>();

describe("ClientConfig utils", () => {
	describe("#getClientConfig", () => {
		it("returns undefined when CLIENT_ID is invalid", () => {
			expect(getClientConfig(clientConfig, "231", logger)).toBeUndefined();
		});

		it("throws error if CLIENT_ID is invalid", () => {
			const testClientConfig = '[{"jwksEndpoint":"https://api.identity.account.gov.uk/.well-known/jwks.json","clientId"]';
			expect(()=>{getClientConfig(testClientConfig, "231", logger);}).toThrow(new AppError(HttpCodesEnum.SERVER_ERROR, "Invalid or missing client config"));
			expect(logger.error).toHaveBeenCalledWith("Invalid or missing client configuration table", { "error": expect.anything(), "messageCode": "MISSING_CONFIGURATION", "sessionClientId": "231" });
	
		});

		it("returns parameter value", () => {
			const value = { "GovNotifyApi": "https://test-govnotify-stub", "YotiBaseUrl": "https://XXX-proxy.review-o.dev.account.gov.uk/yoti", "clientId": "test-config", "jwksEndpoint": "https://api.identity.account.gov.uk/.well-known/jwks.json", "redirectUri": "http://localhost:8085/callback" };
			const userConfig = getClientConfig(clientConfig, "test-config", logger);
			expect(userConfig).toEqual(value);
		});
	});
});
