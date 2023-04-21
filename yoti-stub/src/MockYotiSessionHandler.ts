import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";

import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import {AppError} from "./utils/AppError";
import {YotiSessionItem} from "./models/YotiSessionItem";
import {YotiRequestProcessor} from "./services/YotiRequestProcessor";
import {YotiSessionRequest} from "./models/YotiSessionRequest";


const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.AUTHORIZATIONCODE_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class MockYotiSessionHandler implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		 switch (event.resource) {
		 	case ResourcesEnum.SESSIONS:
		 		if (event.httpMethod === "POST") {
					try {
						logger.info("Event received", { event });

						const bodyParsed = JSON.parse(event.body as string);
						console.log(bodyParsed)

						return await YotiRequestProcessor.getInstance(logger, metrics).createSession(event, new YotiSessionItem());
						//return new Response(HttpCodesEnum.CREATED, JSON.stringify(new YotiSessionItem()));
					} catch (err: any) {
						logger.error({ message: "An error has occurred.", err });
						if (err instanceof AppError) {
							return new Response(err.statusCode, err.message);
						}
						return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					}
				}
				 break;

				 case ResourcesEnum.SESSIONS_CONFIGURATION:
					 if (event.httpMethod === "GET") {
						 try {
							 logger.info("Event received", {event});

							 if (event && event.pathParameters) {
								 // Extract attributes from queryStringParameters and add them to the data object
								 const sessionId = event.pathParameters?.sessionId;
								 if(sessionId){
									 return await YotiRequestProcessor.getInstance(logger, metrics).getSessionConfiguration(sessionId);
								 }
							 }

						 } catch (err: any) {
							 logger.error({message: "An error has occurred.", err});
							 if (err instanceof AppError) {
								 return new Response(err.statusCode, err.message);
							 }
							 return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
						 }
					 }
					 break;
			 case ResourcesEnum.INSTRUCTIONS:
				 if (event.httpMethod === "PUT") {
					 try {
						 logger.info("Event received", {event});

						 if (event && event.pathParameters) {
							 // Extract attributes from queryStringParameters and add them to the data object
							 const sessionId = event.pathParameters?.sessionId;
							 if(sessionId){

								 await YotiRequestProcessor.getInstance(logger, metrics).getSession(sessionId);
								 return new Response(HttpCodesEnum.OK, "");
							 }
						 }

					 } catch (err: any) {
						 logger.error({message: "An error has occurred.", err});
						 if (err instanceof AppError) {
							 return new Response(err.statusCode, err.message);
						 }
						 return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					 }
				 }
				 break;

			 case ResourcesEnum.INSTRUCTIONS_PDF:
			 if (event.httpMethod === "GET") {
				 try {
					 logger.info("Event received", {event});

					 if (event && event.pathParameters) {
						 // Extract attributes from queryStringParameters and add them to the data object
						 const sessionId = event.pathParameters?.sessionId;
						 if(sessionId){

							 await YotiRequestProcessor.getInstance(logger, metrics).getSession(sessionId);
							 return YotiRequestProcessor.getInstance(logger, metrics).fetchInstructionsPdf();
						 }
					 }

				 } catch (err: any) {
					 logger.error({message: "An error has occurred.", err});
					 if (err instanceof AppError) {
						 return new Response(err.statusCode, err.message);
					 }
					 return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
				 }
			 }
				 break;
			 default:
			 	throw new AppError(`Requested resource does not exist: ${event.resource}`, HttpCodesEnum.NOT_FOUND);
		}
	}

}
const handlerClass = new MockYotiSessionHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
