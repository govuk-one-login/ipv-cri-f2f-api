import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../AuthorizationCodeHandler";
import { dbClient } from "./mocks/dbClient";
import { sqsClient } from "./mocks/sqsClient";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";

export const authRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
authRouter.post("/", async (req, res) => {
	const response = await lambdaHandler(req.body, {}, dbClient, sqsClient);
	res.send(response);
});
