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
			logLevel: "info",
		};
	});  
	
	it("tests against potential new contracts", async () => {
		console.log("START PACT VERIFICATION");
		let result;
		await new Verifier(opts)
			.verifyProvider()
			.then((output) => {
				console.log("PACT VERIFICATION COMPLETE");
				result = Number(output.match(/\d+/));
			})
			.catch((error) => {
				console.log("PACT VERIFY ERROR");
				console.log(error);
				result = 1;
			});
		expect(result).toBe(0);
	});

	// it("should validate the expectations of Authorization API", async () => {
	// 	logger.debug("PactBroker opts: ", { opts });
	// 	let result;

	// 	await new Verifier(opts)
	// 		.verifyProvider()
	// 		.then((output) => {
	// 			logger.info("Pact Verification Complete!");
	// 			logger.info("Output: ", output);
	// 			result = Number(output.match(/\d+/));				
	// 		})
	// 		.catch((error) => {
	// 			logger.error("Pact verification failed :(", { error });
	// 			result = 1;
	// 		});
	// 	expect(result).toBe(0);		
	// });
});
