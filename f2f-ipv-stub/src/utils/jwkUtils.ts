import { GetPublicKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { getHashedKid } from "./hashing";
import { createPublicKey } from "node:crypto";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { JsonWebKey } from "../auth.types";

export const v3KmsClient = new KMSClient({
  region: process.env.REGION ?? "eu-west-2",
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    socketTimeout: 29000,
  }),
  maxAttempts: 2,
});

export const getAsJwk = async (keyId: string): Promise<JsonWebKey | null> => {
  let publicSigningKey: any;
  try {
    publicSigningKey = await v3KmsClient.send(
      new GetPublicKeyCommand({ KeyId: keyId })
    );
  } catch (error) {
    console.warn("Failed to fetch key from KMS", { error });
  }
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
  const map = conversions.find((x) => x.keySpec === publicSigningKey?.KeySpec);
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
    const kid = keyId.split("/").pop()!;
    const hashedKid = getHashedKid(kid);
    return {
      ...publicKey,
      use,
      kid: hashedKid,
      alg: map.algorithm,
    } as unknown as JsonWebKey;
  }
  return null;
};
