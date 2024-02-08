import express from "express";
import asyncify from "express-asyncify";
import { lambdaHandler } from "../../../AccessTokenHandler";
import { APIGatewayProxyEvent } from "aws-lambda";
import { eventRequest } from "../model/ApiGatewayEvents";

process.env.SESSION_TABLE = "session-table";
process.env.TXMA_QUEUE_URL = "txma-queue";
process.env.ISSUER = "issuer";
process.env.USE_MOCKED = "true";
process.env.KMS_KEY_ARN = "kid";

export const accessTokenRouter = asyncify(express.Router());

function convertRequestBodyObjectToString(body: { [key: string]: string }): string {
	const params = new URLSearchParams(body);
	const formDataString = params.toString();
	console.log("-----bosyStr" + formDataString);
	return formDataString;
}


// eslint-disable-next-line @typescript-eslint/no-misused-promises, max-lines-per-function
accessTokenRouter.post("/", async (req, res) => {		
	console.log("AccessToken Request body: " + JSON.stringify(req.body) );
	const event: APIGatewayProxyEvent = eventRequest;
	event.httpMethod = req.method;
	event.body = convertRequestBodyObjectToString(req.body);
	//event.body = "client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&code=0328ba66-a1b5-4314-acf8-f4673f1f05a2&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fidentity.staging.account.gov.uk%2Fcredential-issuer%2Fcallback%3Fid%3Df2f&client_assertion=eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJpcHYtY29yZSIsInN1YiI6Imlwdi1jb3JlIiwiYXVkIjoiZHVtbXlGMmZDb21wb25lbnRJZCIsImV4cCI6NDA3MDkwOTcwMCwianRpIjoiU2NuRjRkR1h0aFpZWFNfNWs4NU9iRW9TVTA0Vy1IM3FhX3A2bnB2MlpVWSJ9.hXYrKJ_W9YItUbZxu3T63gQgScVoSMqHZ43UPfdB8im8L4d0mZPLC6BlwMJSsfjiAyU1y3c37vm-rV8kZo2uyw";
	
	const response = await lambdaHandler(event, {});
	console.log("AccessToken response: " + JSON.stringify(response));
	res.status(response.statusCode);
	res.setHeader("Content-Type", "application/json");
	res.send(response.body);
	
});

