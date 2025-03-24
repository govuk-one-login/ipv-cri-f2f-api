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
  	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  	done(error?: Error, result?: any): void {
	},
  	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
	  fail(error: Error | string): void {
	},
	getRemainingTimeInMillis(): number {
		return 0;
	},
  	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
	  succeed(messageOrObject: any, object?: any): void {
	},
};
