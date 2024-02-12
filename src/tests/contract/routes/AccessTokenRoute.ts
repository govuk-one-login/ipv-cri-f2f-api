import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../AccessTokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { translateHttpRequestToApiGatewayProxyEvent } from "../utils/ApiRequestUtils";
import { Constants } from "../utils/Constants";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

export const accessTokenRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises, max-lines-per-function
accessTokenRouter.post("/", async (req, res) => {		
	const event : APIGatewayProxyEvent = translateHttpRequestToApiGatewayProxyEvent(Constants.TOKEN_ENDPOINT, req.body, req.headers);
	
	const tokenResponse = await lambdaHandler(event, {});
	res.status(tokenResponse.statusCode);
	res.setHeader("Content-Type", "application/json");
	res.send(tokenResponse.body);	
});


