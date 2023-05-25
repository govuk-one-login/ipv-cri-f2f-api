// import yotiRequestData from "../data/yotiSessionsPayloadValid.json";
// import { postYotiSession } from "../utils/ApiTestSteps";
// import { getYotiSessionsConfiguration } from "../utils/ApiTestSteps";
// import { putYotiSessionsInstructions } from "../utils/ApiTestSteps";
// import { getYotiSessionsInstructions } from "../utils/ApiTestSteps";

// describe("Yoti /sessions endpoint", () => {

// 	//responseCode, user_tracking_ui
// 	const postSessionsParams = [
// 		[201, "2000"],
// 		[400, "1400"],
// 		[401, "1401"],
// 		[403, "1403"],
// 		[503, "1503"],
// 	];
// 	it.each(postSessionsParams)("Yoti - expect '%i' response on POST/sessions '/sessions'", async (responseCode, userTrackerId) => {
// 		const response = await postYotiSession(userTrackerId, yotiRequestData);
	
// 		console.log("post response: " + JSON.stringify(response.data))
	
// 		expect(response.status).toBe(responseCode);
// 	});
	
// 	//responseCode, SessionId
//     const getConfigurationParams = [
// 		[200, "0000"],
// 	    [400, "2400"],
// 		[401, "2401"],
// 		[404, "2404"],
// 		[409, "2409"],
// 		[503, "2503"],
// 	  ];
//     it.each(getConfigurationParams)("Yoti - expect '%i' response on GET/sessions/configuration '/sessions/%s/configuration'", async (responseCode, sessionId) => {
// 		const response = await getYotiSessionsConfiguration(sessionId);

// 		console.log("post response: " + JSON.stringify(response.data))

// 		expect(response.status).toBe(responseCode);
// 	});

// 		//responseCode, SessionId
// 		const putInstructionsParams = [
// 			[200, "0000"],
// 			[400, "3400"],
// 			[401, "3401"],
// 			[404, "3404"],
// 			[409, "3409"],
// 			[503, "3503"],
// 		  ];
// 		it.each(putInstructionsParams)("Yoti - expect '%i' response on PUT/ssessions/{id}/instructions/pdf '/sessions/%s/instructions/pdf'", async (responseCode, sessionId) => {
// 			const response = await putYotiSessionsInstructions(sessionId);
	
// 			console.log("post response: " + JSON.stringify(response.data))
	
// 			expect(response.status).toBe(responseCode);
// 		});

// 		//responseCode, SessionId
// 		const getInstructionsParams = [
// 			[200, "0000"],
// 			[400, "4400"],
// 			[401, "4401"],
// 			[404, "4404"],
// 			[409, "4409"],
// 			[500, "4500"],
// 			[503, "4503"],
// 		  ];
// 		it.each(getInstructionsParams)("Yoti - expect '%i' response on GET/sessions/instructions '/sessions/%s/instructions'", async (responseCode, sessionId) => {
// 			const response = await getYotiSessionsInstructions(sessionId);
	
// 			console.log("post response: " + JSON.stringify(response.data))
	
// 			expect(response.status).toBe(responseCode);
// 		});
// });
