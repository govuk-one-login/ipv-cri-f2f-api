import { APIGatewayProxyResult } from "aws-lambda";
import { Jwks } from "../auth.types";
import { getKeyFromKmsAsJwk } from "../utils/jwkUtils";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const { signingKey, additionalKey } = getConfig();
  const jwks: Jwks = {
    keys: [],
  };
  if (signingKey != null) {
    const signingKeyId = signingKey.split("/").pop() ?? "";
    const formattedSigningKey = await getKeyFromKmsAsJwk(signingKeyId);
    if (formattedSigningKey != null) {
      jwks.keys.push(formattedSigningKey);
    }
  }

  if (additionalKey != null) {
    const additionalKeyId = additionalKey.split("/").pop() ?? "";
    const formattedAdditionalKey = await getKeyFromKmsAsJwk(additionalKeyId);
    if (formattedAdditionalKey != null) {
      jwks.keys.push(formattedAdditionalKey);
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(jwks),
  };
};

function getConfig(): {
  signingKey: string | null;
  additionalKey: string | null;
} {
  return {
    signingKey: process.env.SIGNING_KEY ?? null,
    additionalKey: process.env.ADDITIONAL_SIGNING_KEY ?? null,
  };
}
