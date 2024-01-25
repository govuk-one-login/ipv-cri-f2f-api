import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../AccessTokenHandler";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";
process.env.USE_MOCKED = "true";

export const accessTokenRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
accessTokenRouter.post("/", async (req, res) => {
	const response = await lambdaHandler(req.body, {});
	res.send(response);
});
