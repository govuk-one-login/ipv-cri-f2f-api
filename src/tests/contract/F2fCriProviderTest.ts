import { Logger } from "@aws-lambda-powertools/logger";
import { Verifier, VerifierOptions } from "@pact-foundation/pact";
import path from "path";

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2fCriProviderTest",
});

let opts: VerifierOptions;
const pactFile = path.resolve("./tests/contract/pacts/IpvCoreBack-F2fCriProviderAll.json");
// Verify that the provider meets all consumer expectations
describe("Pact Verification", () => {
	beforeAll(() => {  
		opts = {
			// we need to know the providers name
			provider: "F2fCriProvider",
			// // we need to where the provider will be running,
			// // we are starting it locally and defined the port above
			providerBaseUrl: "http://localhost:3000",
			//pactBrokerUrl: "https://ysi5tc076m.execute-api.eu-west-2.amazonaws.com",
			// consumerVersionSelectors: [
			// 	{ mainBranch: true },
			// 	{ deployedOrReleased: true },
			//   ],
			pactUrls: [pactFile],
			publishVerificationResult: false,
			providerVersion: "1.0.1",
			// You can set the log level here, useful for debugging
			logLevel: "debug",
		};
	});  
  
	// eslint-disable-next-line jest/expect-expect
	it("should validate the expectations of Authorization API", async () => {
		logger.debug("PactBroker opts: ", { opts });
		try {
			const output = await new Verifier(opts)
				.verifyProvider();
			logger.info("Pact Verification Complete!");
			logger.info("Output: ", output);
		} catch (error) {
			logger.error("Pact verification failed :(", { error });
		}
	});
});
