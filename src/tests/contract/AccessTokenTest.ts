import { Logger } from "@aws-lambda-powertools/logger";
import axios, { AxiosRequestConfig } from "axios";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "AccessTokenTest",
});

const AUTHORIZATION_CODE = "0328ba66-a1b5-4314-acf8-f4673f1f05a2";
const ENCODED_REDIRECT_URI = encodeURIComponent("https://identity.staging.account.gov.uk/credential-issuer/callback?id=f2f");

const runTest = async () => {
	const config: AxiosRequestConfig = {
		url : "http://localhost:3000/token",
		method: "POST",
		data: `code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`,		
	};
	try {
		const accessTokenResponse = await axios(config);
		logger.info("AccessToken Status: ", accessTokenResponse.status.toString());
		logger.info("AccessToken Response", accessTokenResponse.data);
	} catch (error) {
		logger.error("Error occurred while running AccessTokenTest", { error });
	}
};

void runTest();
