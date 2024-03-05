/* eslint-disable max-lines-per-function */
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId } from "./ApiTestSteps";

describe("Address fields tests", () => {
	let sessionId: string;
	beforeEach(() => {
		f2fStubPayload.yotiMockID = "0000";
		f2fStubPayload.shared_claims.address[0].uprn = "123456789";
		f2fStubPayload.shared_claims.address[0].addressLocality = "Sidney";
		f2fStubPayload.shared_claims.address[0].postalCode = "F1 1SH";
		f2fStubPayload.shared_claims.address[0].streetName = "Wallaby Way";
	});

	it("buildingName and subBuildingName missing", async () => {
		f2fStubPayload.shared_claims.address[0].buildingNumber = "32";
		f2fStubPayload.shared_claims.address[0].buildingName = "";
		f2fStubPayload.shared_claims.address[0].subBuildingName = "";
		console.log(JSON.stringify(f2fStubPayload));
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		console.log(response.data);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("buildingNumber missing", async () => {
		f2fStubPayload.shared_claims.address[0].buildingNumber = "";
		f2fStubPayload.shared_claims.address[0].buildingName = "19 A";
		f2fStubPayload.shared_claims.address[0].subBuildingName = "";
		console.log(JSON.stringify(f2fStubPayload));
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		console.log(response.data);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("buildingNumber and buildingName is missing", async () => {
		f2fStubPayload.shared_claims.address[0].buildingNumber = "";
		f2fStubPayload.shared_claims.address[0].buildingName = "";
		f2fStubPayload.shared_claims.address[0].subBuildingName = "Flat 5";
		console.log(JSON.stringify(f2fStubPayload));
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		console.log(response.data);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("buildingNumber is missing", async () => {
		f2fStubPayload.shared_claims.address[0].buildingNumber = "";
		f2fStubPayload.shared_claims.address[0].buildingName = "19 A";
		f2fStubPayload.shared_claims.address[0].subBuildingName = "Flat 5";
		console.log(JSON.stringify(f2fStubPayload));
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		console.log(response.data);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});
