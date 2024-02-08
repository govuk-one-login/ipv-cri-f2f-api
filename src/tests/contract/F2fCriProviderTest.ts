import { Verifier, VerifierOptions } from "@pact-foundation/pact";
import path from "path";

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
			//pactBrokerUsername: "SbdY9a65mUwN",
			//pactBrokerPassword: "P8Hkz71HN53M",
			// consumerVersionSelectors: [
			// 	{ mainBranch: true },
			// 	{ deployedOrReleased: true },
			//   ],
			pactUrls: [pactFile],
			publishVerificationResult: false,
			providerVersion: "1.0.1",
			// You can set the log level here, useful for debugging
			logLevel: "info",
			// stateHandlers:{
			// 	"dummyAuthCode is a valid authorization code": () => {
			// 		return Promise.resolve("Recieved valid token");
			// 	},

			// },
		};
	});
	//   // The PACT_URL can either be a path to a local file
	//   // or one from a Pact Broker
	//   if (process.env.PACT_URL) {
	//     opts = {
	//       ...opts,
	//       pactUrls: [process.env.PACT_URL]
	//     }
	//     // as a convenience, we have provided a path to the example consumer/provider pact
	//     // generated when running npm run test:consumer
	//   } else if (!process.env.PACT_URL && !process.env.PACT_BROKER_BASE_URL) {
	//     opts = {
	//       ...opts,
	//       pactUrls: [pactFile]
	//     }
	//   }
  
	//   // If we have a broker, then some more options are relevant
	//   if (process.env.PACT_BROKER_BASE_URL) {
	//     opts = {
	//       ...opts,
	//       // we need to know where our broker is located
	//       pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
	//       // we need specifics about the provider version we are verifying so we 
	//       // can identify it later
	//       providerVersion: process.env.GIT_COMMIT,
	//       providerVersionBranch: process.env.GIT_BRANCH,
	//       // we only want to publish pacts if we are in CI
	//       publishVerificationResult: !!process.env.CI ?? false,
	//     }
  
  
	//     // we need to setup our broker authentication options
	//     // if setup
	//     if (process.env.PACT_BROKER_USERNAME) {
	//       opts = {
	//         ...opts,
	//         pactBrokerUsername: process.env.PACT_BROKER_USERNAME,
	//         pactBrokerPassword: process.env.PACT_BROKER_PASSWORD
	//       }
	//     }  
  
  
	it("should validate the expectations of Authorization API", () => {
		console.log(opts);
		return new Verifier(opts)
			.verifyProvider()
			.then((output: any) => {
				console.log("Pact Verification Complete!");
				console.log("Output: " + output);
			})
			.catch((e: any) => {
				console.error("Pact verification failed :(", e);
			});
	});
});
