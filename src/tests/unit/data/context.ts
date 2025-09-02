import { Context } from "aws-lambda";

export const CONTEXT: Context = {
	awsRequestId: "",
	callbackWaitsForEmptyEventLoop: false,
	functionName: "F2F",
	functionVersion: "",
	invokedFunctionArn: "",
	logGroupName: "",
	logStreamName: "",
	memoryLimitInMB: "",
  	done(error?: Error, result?: any): void {
	},
	  fail(error: Error | string): void {
	},
	getRemainingTimeInMillis(): number {
		return 0;
	},
	  succeed(messageOrObject: any, object?: any): void {
	},
};
