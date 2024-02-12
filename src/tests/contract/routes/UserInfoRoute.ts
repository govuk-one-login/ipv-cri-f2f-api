import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../UserInfoHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { translateHttpRequestToApiGatewayProxyEvent } from "../utils/ApiRequestUtils";
import { Constants } from "../utils/Constants";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

export const userInfoRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
userInfoRouter.post("/", async (req, res) => {
	const event: APIGatewayProxyEvent = translateHttpRequestToApiGatewayProxyEvent(Constants.USERINFO_ENDPOINT, req.body, req.headers);
		
	const userInfoResponse = await lambdaHandler(event, {});
	res.status(userInfoResponse.statusCode);
	res.setHeader("Content-Type", "application/json");
	res.send(userInfoResponse.body);
});
