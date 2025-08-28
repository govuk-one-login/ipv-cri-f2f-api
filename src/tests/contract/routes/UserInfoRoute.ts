import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../UserInfoHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { convertIncomingHeadersToAPIGatewayHeaders, eventRequest } from "../utils/ApiRequestUtils";
import { Constants } from "../utils/Constants";

export const userInfoRouter = asyncify(express.Router());

 
userInfoRouter.post("/", async (req, res) => {
	const event: APIGatewayProxyEvent = eventRequest;
	event.headers = convertIncomingHeadersToAPIGatewayHeaders(req.headers);	
		
	const userInfoResponse = await lambdaHandler(event, {});
	res.status(userInfoResponse.statusCode);
	res.setHeader(Constants.HTTP_CONTENT_TYPE_HEADER, Constants.JSON_CONTENT_TYPE);
	res.send(userInfoResponse.body);
});

