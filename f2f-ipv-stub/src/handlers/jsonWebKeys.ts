import { APIGatewayProxyResult } from "aws-lambda";
import { createPublicKey } from "node:crypto";
import { JsonWebKey, Jwks } from "../auth.types";
import { GetPublicKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const { signingKey } = getConfig();
  const jwks: Jwks = {
    keys: [],
  };
  if (signingKey != null) {
    const signingKeyId = signingKey.split("/").pop() ?? "";
    const formattedKey = await getAsJwk(signingKeyId);
    if (formattedKey != null) {
      jwks.keys.push(formattedKey);
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(jwks),
  };
};

const v3KmsClient = new KMSClient({
  region: process.env.REGION ?? "eu-west-2",
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    socketTimeout: 29000,
  }),
  maxAttempts: 2,
});

function getConfig(): { signingKey: string | null } {
  return { signingKey: process.env.SIGNING_KEY ?? null };
}

const getAsJwk = async (keyId: string): Promise<JsonWebKey | null> => {
  let publicSigningKey;
  try {
    publicSigningKey = await v3KmsClient.send(
      new GetPublicKeyCommand({ KeyId: keyId })
    );
  } catch (error) {
    console.warn("Failed to fetch key from KMS", { error });
  }
  const map = getKeySpecMap(publicSigningKey?.KeySpec);
  if (
    publicSigningKey != null &&
    map != null &&
    publicSigningKey.KeyId != null &&
    publicSigningKey.PublicKey != null
  ) {
    const use = publicSigningKey.KeyUsage === "ENCRYPT_DECRYPT" ? "enc" : "sig";
    const publicKey = createPublicKey({
      key: Buffer.from(publicSigningKey.PublicKey),
      type: "spki",
      format: "der",
    }).export({ format: "jwk" });
    return {
      ...publicKey,
      use,
      kid: keyId.split("/").pop(),
      alg: map.algorithm,
    } as unknown as JsonWebKey;
  }
  return null;
};

const getKeySpecMap = (
  spec?: string
): { keySpec: string; algorithm: string } | undefined => {
  if (spec == null) return undefined;
  const conversions = [
    {
      keySpec: "ECC_NIST_P256",
      algorithm: "ES256",
    },
    {
      keySpec: "RSA_2048",
      algorithm: "RS256",
    },
  ];
  return conversions.find((x) => x.keySpec === spec);
};
