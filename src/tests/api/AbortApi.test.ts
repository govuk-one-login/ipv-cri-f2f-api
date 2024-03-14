/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable max-lines-per-function */
import f2fStubPayload from "../data/exampleStubPayload.json";
import abortPayload from "../data/abortPayload.json";
import { startStubServiceAndReturnSessionId, postAbortSession, abortPost, getSessionAndVerifyKey } from "./ApiTestSteps";
import { constants } from "./ApiConstants";
import { getTxmaEventsFromTestHarness, validateTxMAEventData } from "./ApiUtils";

describe("E2E Happy Path /abort enpoint", () => {
	let sessionId: string;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = newSessionId;
		console.log("session id: " + sessionId);
	});

	it("E2E Happy Path Journey - Abort Session", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postAbortSession(abortPayload, sessionId);
		expect(response.headers.location).toContain("%2Fredirect%3Fid%3Df2f%26error%3Daccess_denied%26state%3D");
	});

	it("E2E Happy Path Journey - Abort Previously Aborted Session", async () => {
		expect(sessionId).toBeTruthy();
		const firstResponse = await postAbortSession(abortPayload, sessionId);
		expect(firstResponse.headers.location).toContain("%2Fredirect%3Fid%3Df2f%26error%3Daccess_denied%26state%3D");

		const secondResponse = await postAbortSession(abortPayload, sessionId);
		expect(secondResponse.status).toBe(200);
		expect(secondResponse.data).toBe("Session has already been aborted");
		expect(firstResponse.headers.location).toContain("%2Fredirect%3Fid%3Df2f%26error%3Daccess_denied%26state%3D");
	});

	 it("E2E Happy Path Journey - Abort Session2", async () => {
     	const response = await abortPost(sessionId);
     	expect(response.status).toBe(200);
     	expect(response.data).toBe("Session has been aborted");

     	expect(response.headers).toBeTruthy();
     	expect(response.headers.location).toBeTruthy();

     	const url = new URL(decodeURIComponent(response.headers.location));
     	expect(url.searchParams.has("error")).toBe(true);
     	expect(url.searchParams.has("state")).toBe(true);
     	expect(url.searchParams.get("error")).toBe("access_denied");

     	await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_CRI_SESSION_ABORTED");
     	await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "state", "" + url.searchParams.get("state"));

     	const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 2);
     	validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
     	validateTxMAEventData({ eventName: "F2F_CRI_SESSION_ABORTED", schemaName: "F2F_CRI_SESSION_ABORTED_SCHEMA" }, allTxmaEventBodies);

	 });

	// eslint-disable-next-line jest/no-identical-title
	it("E2E Happy Path Journey - Abort Previously Aborted Session2", async () => {

     	const response = await abortPost(sessionId);
		expect(response.status).toBe(200);
     	expect(response.data).toBe("Session has been aborted");

     	const url = new URL(decodeURIComponent(response.headers.location));
     	expect(url.searchParams.has("error")).toBe(true);
     	expect(url.searchParams.has("state")).toBe(true);
     	expect(url.searchParams.get("error")).toBe("access_denied");

     	await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_CRI_SESSION_ABORTED");

     	const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 2);

     	validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);

     	validateTxMAEventData({ eventName: "F2F_CRI_SESSION_ABORTED", schemaName: "F2F_CRI_SESSION_ABORTED_SCHEMA" }, allTxmaEventBodies);

		expect(response.headers).toBeTruthy(); 
		expect(response.headers.location).toBeTruthy();

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "state", "" + url.searchParams.get("state"));
	 });
});

