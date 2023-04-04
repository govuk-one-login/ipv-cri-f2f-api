import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export async function getParameter(path: string): Promise<string> {
	const client = new SSMClient({ region: process.env.REGION });
	const command = new GetParameterCommand({ Name: path });
	const response = await client.send(command);

	if (response.Parameter == null) { throw new Error("Parameter not found"); }
	if (response.Parameter.Value == null) { throw new Error("Parameter is null"); }
	return response.Parameter.Value;
}
