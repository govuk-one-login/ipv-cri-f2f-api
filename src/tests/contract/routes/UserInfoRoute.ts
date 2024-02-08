import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../UserInfoHandler";
import { APIGatewayProxyEvent, APIGatewayProxyEventHeaders } from "aws-lambda";
import { IncomingHttpHeaders } from "http";
import { eventRequest } from "../model/ApiGatewayEvents";
import { Logger } from "@aws-lambda-powertools/logger";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

const logger = new Logger({
	logLevel: "INFO",
	serviceName: "UserInfoRoute",
});

function convertIncomingHeadersToAPIGatewayHeaders(incomingHeaders: IncomingHttpHeaders): APIGatewayProxyEventHeaders {
	const apiGatewayHeaders: APIGatewayProxyEventHeaders = {};

	for (const [key, value] of Object.entries(incomingHeaders)) {
		apiGatewayHeaders[key] = value!.toString();
	}
	return apiGatewayHeaders;
}

export const userInfoRouter = asyncify(express.Router());

// eslint-disable-next-line @typescript-eslint/no-misused-promises
userInfoRouter.post("/", async (req, res) => {
	const event: APIGatewayProxyEvent = eventRequest;
	event.headers = convertIncomingHeadersToAPIGatewayHeaders(req.headers);
	event.httpMethod = req.method;
	
	const response = await lambdaHandler(event, {});

	logger.info("UserInfo response: ", { response });
	res.status(response.statusCode);
	res.setHeader("Content-Type", "application/json");
	res.send(response.body);
});
