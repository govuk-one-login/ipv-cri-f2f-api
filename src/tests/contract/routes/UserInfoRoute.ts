import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../UserInfoHandler";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

export const userInfoRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
userInfoRouter.post("/", async (req, res) => {
	const response = await lambdaHandler(req.body, {});
	res.send(response);
});
