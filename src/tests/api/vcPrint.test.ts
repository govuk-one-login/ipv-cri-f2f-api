import jwtToken from "../data/jwtToken.json";
import { printVerifiableCredential } from "../utils/ApiTestSteps";


describe("VC Testing", () => {

	it("F2F Print Verificable Credential", async () => {
		printVerifiableCredential(jwtToken.jwtToken)
	});
});
