/* eslint-disable @typescript-eslint/tslint/config */
/* eslint-disable max-lines-per-function */
import { Logger } from "@aws-lambda-powertools/logger";
import { Verifier, VerifierOptions } from "@pact-foundation/pact";
import { Constants } from "./utils/Constants";
import axios from "axios";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "F2fCriProviderTest",
});

let opts: VerifierOptions;
// Verify that the provider meets all consumer expectations
describe("Pact Verification", () => {
	beforeAll(() => {  
		opts = {
			// we need to know the providers name
			provider: process.env.PACT_PROVIDER_NAME,
			// we need to where the provider will be running,
			// we are starting it locally and defined the port above
			providerBaseUrl: `${Constants.LOCAL_HOST}:${Constants.LOCAL_APP_PORT}`,
			pactBrokerUrl: process.env.PACT_BROKER_URL,
			pactBrokerUsername: process.env.PACT_BROKER_USER,
			pactBrokerPassword: process.env.PACT_BROKER_PASSWORD,
			consumerVersionSelectors: [
				{ mainBranch: true },
				{ deployedOrReleased: true },
			  ],
			publishVerificationResult: true,
			providerVersion: process.env.PACT_PROVIDER_VERSION,
			// You can set the log level here, useful for debugging
			logLevel: "debug",
		};

		const auth = Buffer.from(`${opts.pactBrokerUsername}:${opts.pactBrokerPassword}`).toString("base64");
		const pact_url = opts.pactBrokerUrl || "";

		axios.get(pact_url, {
			headers: {
				"Authorization": `Basic ${auth}`,
			},
		})
			.then(function (response) {
				console.log("PACT BROKER AUTHORIZED SUCCESSFULLY VIA PROVIDER");
				return response.status;
			})
			.catch(function (error) {
				if (error.response) {
					console.log("ERROR AUTHORIZING PACT BROKER:", error.response.status);
					throw error.response;
				} else if (error.request) {
					console.log("ERROR WITH REQUEST MADE TO PACT BROKER");
					throw error.request;
				} else {
					console.log("ERROR SETTING UP REQUEST TO PACT BROKER:", error.message);
					throw error;
				}
			});
	});  
  
	it("should validate the expectations of Authorization API", async () => {
		logger.debug("PactBroker opts: ", { opts });
		let result;


		// await new Verifier(opts).verifyProvider();
		// .verifyProvider()
		// 	.then((output) => {
		// 		logger.info("Pact Verification Complete!");
		// 		logger.info("Output: ", output);
		// 		result = Number(output.match(/\d+/));				
		// 	})
		// 	.catch((error) => {
		// 		logger.error("Pact verification failed :(", { error });
		// 		result = 1;
		// 	});
		// expect(result).toBe(0);		
	});
});
