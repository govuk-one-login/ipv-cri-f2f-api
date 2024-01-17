import express from "express";
import { lambdaHandler } from "../../AuthorizationCodeHandler";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";

export const authRouter = express.Router();

authRouter.post("/", (req, res) => {
	const response = lambdaHandler(req.body, {});
	res.send(response);
});
