import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../AccessTokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { convertUrlEncodedRequestBodyToString, eventRequest } from "../utils/ApiRequestUtils";
import { Constants } from "../utils/Constants";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

export const accessTokenRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
accessTokenRouter.post("/", async (req, res) => {		
	const event: APIGatewayProxyEvent = eventRequest;
	event.body = convertUrlEncodedRequestBodyToString(req.body);
	
	const tokenResponse = await lambdaHandler(event, {});
	res.status(tokenResponse.statusCode);
	res.setHeader(Constants.HTTP_CONTENT_TYPE_HEADER, Constants.JSON_CONTENT_TYPE);
	res.send(tokenResponse.body);	
});

