import { createSsmClient, GetParameterCommand } from "./SSMClient";

export async function getParameter(path: string, withDecryption = false): Promise<string> {
	const client = createSsmClient();
	const command = new GetParameterCommand({ Name: path, WithDecryption: withDecryption });
	const response = await client.send(command);

	if (response.Parameter == null) { throw new Error("Parameter not found"); }
	if (response.Parameter.Value == null) { throw new Error("Parameter is null"); }
	return response.Parameter.Value;
}
