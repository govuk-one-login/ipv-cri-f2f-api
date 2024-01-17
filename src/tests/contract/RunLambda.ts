import { lambdaHandler } from "../../AuthorizationCodeHandler";
import express from "express";

export const authRouter = express.Router();

authRouter.post("/", (req, res) => {
	console.log("============================================");
	console.log("req", req.body);

	const response = lambdaHandler(req.body, {});
	res.send(response);
});
