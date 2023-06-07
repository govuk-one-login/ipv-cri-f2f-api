import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById, callbackPost, updateYotiSessionId} from "../utils/ApiTestSteps";


describe("Yoti /sessions endpoint", () => {

	const mockIdParams = [		
        // ["0001"],
        // ["0002"],
        // ["0003"],
		// ["0004"],
		// ["0005"],
		// ["0006"],
		// ["0007"],
		// ["0008"],
		// ["0009"],
		// ["0010"],
		// ["0011"],
		// ["0012"],
		// ["0013"],
		// ["0014"],
		// ["0015"],
		// ["0016"],
		// ["0017"],
		// ["0018"],
		// ["0019"],
		// ["0020"],
		// ["0021"],
		// ["0022"],
		["0023"],
		// ["0024"],
		// ["0025"],
		// ["0026"],
		// ["0027"],
		// ["0028"],
		// ["0029"],
	];
	it.each(mockIdParams)("F2F CRI Callback Endpoint - yotiMockId:", async (yotiMockId) => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
        // Document Selection
		const response = await postDocumentSelection(dataPassport, sessionId);
        console.log(response.data);
        expect(response.status).toBe(200);
		// Get Yoti Session Id
		const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
        const yotiSessionId: any = session?.yotiSessionId;
        console.log("yotiSessionId: " + yotiSessionId);
        // Update Yoti Session Id
        const updatedYotiSessionId = yotiSessionId.slice(0,-4) + yotiMockId;
        console.log("Updated yotiSessionId: " + updatedYotiSessionId);
        await updateYotiSessionId(sessionId, yotiSessionId, updatedYotiSessionId);
        // Yoti Callback
        const callbackResponse = await callbackPost(updatedYotiSessionId);
        console.log(callbackResponse.data);
        console.log(callbackResponse.status);
	});
});  
