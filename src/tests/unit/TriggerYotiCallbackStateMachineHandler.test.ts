 
import {  INVALID_YOTI_TOPIC_SQS_EVENT, VALID_SESSION_COMPLETION_SQS_EVENT, VALID_THANK_YOU_SQS_EVENT } from "./data/sqs-events";
import { handlerClass, lambdaHandler, logger } from "../../TriggerYotiCallbackStateMachineHandler";
import { MessageCodes } from "../../models/enums/MessageCodes";
import { passEntireBatch, failEntireBatch } from "../../utils/SqsBatchResponseHelper";

jest.mock("@aws-lambda-powertools/logger", () => ({
	Logger: jest.fn().mockImplementation(() => ({
		debug: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		setPersistentLogAttributes: jest.fn(),
		addContext: jest.fn(),
		appendKeys: jest.fn(),
	})),
}));

jest.mock("@aws-sdk/client-sfn", () => ({
	SFNClient: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	StartExecutionCommand: jest.fn().mockImplementation((params) => params),
}));

describe("TriggerYotiCallbackStateMachineHandler", () => {
	it("fails batch if incorrect number of records is passed", async () => {
		const event = { "Records": [] };

		const response = await lambdaHandler(event, "F2F");

		expect(response).toEqual(failEntireBatch);
		expect(logger.warn).toHaveBeenCalledWith("Unexpected no of records received", {
			messageCode: MessageCodes.INCORRECT_BATCH_SIZE,
		});
	});

	it("logs warning and passes batch if unrecognised topic is passed", async () => {
		const response = await lambdaHandler(INVALID_YOTI_TOPIC_SQS_EVENT, "F2F");

		expect(response).toEqual(passEntireBatch);
		expect(logger.warn).toHaveBeenCalledWith("Unexpected topic received in request", {
			topic: "unknown_event",
			messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
		});
	});

	it.each([
		{ topic: "session_completion", event: VALID_SESSION_COMPLETION_SQS_EVENT },
		{ topic: "thank_you_email_requested", event: VALID_THANK_YOU_SQS_EVENT },
	])("invokes step function when $topic event is passed", async ({ topic, event }) => {
		await lambdaHandler(event, "F2F");
		expect(logger.appendKeys).toHaveBeenCalledWith({
			yotiSessionId: "eb26c8e0-397b-4f5e-b7a5-62cd0c6e510b",
		});
		expect(logger.info).toHaveBeenCalledWith("Matched topic, triggering state machine", { topic });
		expect(handlerClass.stepFunctionsClient.send).toHaveBeenCalled();
	});

	it("error is returned if step function fails", async () => {
		const error = new Error("Failed to execute step function");
		jest.spyOn(handlerClass.stepFunctionsClient, "send").mockImplementationOnce(() => {
			throw error;
		});

		await expect(lambdaHandler(VALID_SESSION_COMPLETION_SQS_EVENT, "F2F")).rejects.toThrow();
		expect(logger.error).toHaveBeenCalledWith({ message: "There was an error executing the yoti callback step function", error });
	});
});
