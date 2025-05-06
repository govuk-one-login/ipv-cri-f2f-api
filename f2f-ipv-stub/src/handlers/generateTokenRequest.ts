import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import crypto from "node:crypto";
import { util } from "node-jose";
import format from "ecdsa-sig-formatter";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { JWTPayload, JwtHeader } from "../auth.types";
import { getHashedKid } from "../utils/hashing";
import { __ServiceException } from "@aws-sdk/client-kms/dist-types/models/KMSServiceException";

export const v3KmsClient = new KMSClient({
  region: process.env.REGION ?? "eu-west-2",
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 29000,
    socketTimeout: 29000,
  }),
  maxAttempts: 2,
});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const config = getConfig();
  const overrides = event.body !== null ? JSON.parse(event.body) : null;

  const iat = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    iss: "https://ipv.core.account.gov.uk",
    sub: crypto.randomUUID(),
    aud: config.aud,
    jti: crypto.randomBytes(16).toString("hex"),
    exp: iat + 3 * 60,
    iat,
  };

  // Unhappy path testing enabled by optional flag provided in stub paylod
  let invalidKey;
  if (overrides?.missingKid != null) {
    invalidKey = crypto.randomUUID();
  }
  if (overrides?.invalidKid != null) {
    invalidKey = config.additionalKey;
  }

  const signedJwt = await sign(payload, config.signingKey, invalidKey);

  return {
    statusCode: 200,
    body: signedJwt,
  };
};

export function getConfig(): {
  signingKey: string;
  additionalKey: string;
  aud: string;
} {
  if (
    process.env.SIGNING_KEY == null ||
    process.env.ADDITIONAL_KEY == null ||
    process.env.JWT_AUDIENCE == null
  ) {
    throw new Error("Missing configuration");
  }
  return {
    signingKey: process.env.SIGNING_KEY,
    additionalKey: process.env.ADDITIONAL_KEY,
    aud: process.env.JWT_AUDIENCE,
  };
}

async function sign(
  payload: JWTPayload,
  keyId: string,
  invalidKeyId: string | undefined
): Promise<string> {
  const signingKid = keyId.split("/").pop() ?? "";
  const invalidKid = invalidKeyId?.split("/").pop() ?? "";
  // If an additional kid is provided to the function, return it in the header to create a mismatch - enable unhappy path testing
  const kid = invalidKeyId ? invalidKid : signingKid;
  const hashedKid = getHashedKid(kid);
  const alg = "ECDSA_SHA_256";
  const jwtHeader: JwtHeader = { alg: "ES256", typ: "JWT", kid: hashedKid };
  const tokenComponents = {
    header: util.base64url.encode(
      Buffer.from(JSON.stringify(jwtHeader)),
      "utf8"
    ),
    payload: util.base64url.encode(
      Buffer.from(JSON.stringify(payload)),
      "utf8"
    ),
    signature: "",
  };

  const res = await v3KmsClient.send(
    new SignCommand({
      // Key used to sign will always be default key
      KeyId: signingKid,
      SigningAlgorithm: alg,
      MessageType: "RAW",
      Message: Buffer.from(
        `${tokenComponents.header}.${tokenComponents.payload}`
      ),
    })
  );
  if (res?.Signature == null) {
    throw res as unknown as __ServiceException;
  }
  tokenComponents.signature = format.derToJose(
    Buffer.from(res.Signature),
    "ES256"
  );
  return `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`;
}
