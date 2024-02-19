import { Logger } from "@aws-lambda-powertools/logger";
import { Verifier, VerifierOptions } from "@pact-foundation/pact";
import path from "path";

const logger = new Logger({
	logLevel: "INFO",
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
			logLevel: "info",
		};
	});  
  
	it("should validate the expectations of Authorization API", async () => {
		logger.debug("PactBroker opts: ", { opts });
		let result;
		await new Verifier(opts)
			.verifyProvider()
			.then((output) => {
				logger.info("Pact Verification Complete!");
				logger.info("Output: ", output);
				result = Number(output.match(/\d+/));				
			})
			.catch((error) => {
				logger.error("Pact verification failed :(", { error });
				result = 1;
			});
		expect(result).toBe(0);		
	});
});
