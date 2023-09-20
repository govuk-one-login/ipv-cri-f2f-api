import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
	console.log('ABORT_EVENT')
	return {
		statusCode: 200,
		body: "Session Aborted",
	}
};
