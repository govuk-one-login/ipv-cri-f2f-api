import { Logger } from "@aws-lambda-powertools/logger";
import { createSsmClient, GetParameterCommand } from "./SSMClient";

export async function getParameter(path: string, logger: Logger): Promise<string> {
	const client = createSsmClient(logger);
	const command = new GetParameterCommand({ Name: path });
	const response = await client.send(command);

	if (response.Parameter == null) { throw new Error("Parameter not found"); }
	if (response.Parameter.Value == null) { throw new Error("Parameter is null"); }
	return response.Parameter.Value;
}
