import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SignCommand } from "@aws-sdk/client-kms";
import crypto from "node:crypto";
import { util } from "node-jose";
import format from "ecdsa-sig-formatter";
import {
  JWTPayload,
  Jwks,
  JwtHeader,
  PublicEncryptionKeyAndKid,
} from "../auth.types";
import axios from "axios";
import { getAsJwk, v3KmsClient } from "../utils/jwkUtils";
import { __ServiceException } from "@aws-sdk/client-kms/dist-types/models/KMSServiceException";
import { getHashedKid } from "../utils/hashing";

let frontendURL: string;
let clientID: string;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const config = getDefaultConfig();
  const overrides = event.body ? JSON.parse(event.body) : {};
  config.jwksUri = overrides.target || config.jwksUri;
  frontendURL = overrides.frontendURL || config.frontUri;
  clientID = overrides.clientId || process.env.CLIENT_ID;

  const defaultClaims = {
    name: [
      {
        nameParts: [
          {
            value: "Kenneth",
            type: "GivenName",
          },
          {
            value: "Automated",
            type: "GivenName",
          },
          {
            value: "Decerqueira",
            type: "FamilyName",
          },
        ],
      },
    ],
    birthDate: [
      {
        value: "1960-02-02",
      },
    ],
    address: [
      {
        uprn: "123456789",
        buildingNumber: "32",
        buildingName: "London",
        subBuildingName: "Flat 20",
        streetName: "Demo",
        addressLocality: "London",
        addressCountry: "GB",
        postalCode: "BA2 5AA",
      },
    ],
    emailAddress: "fred.flintstone@bedrock-live.com",
  };

  const iat = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: crypto.randomUUID(),
    redirect_uri: config.redirectUri,
    response_type: "code",
    govuk_signin_journey_id:
      overrides?.gov_uk_signin_journey_id ||
      crypto.randomBytes(16).toString("hex"),
    aud: frontendURL,
    iss: "https://ipv.core.account.gov.uk",
    client_id: clientID,
    state: crypto.randomBytes(16).toString("hex"),
    iat,
    nbf: iat - 1,
    exp: iat + 3 * 60,
    shared_claims: overrides?.shared_claims || defaultClaims,
    evidence_requested: overrides?.evidence_requested,
    jti: crypto.randomBytes(16).toString("hex"),
  };

  if (!overrides?.evidence_requested) delete payload.evidence_requested;

  if (overrides?.yotiMockID?.length > 4)
    throw new Error("Only 4 digits values allowed for yotiMockID");

  if (overrides?.yotiMockID) {
    const namePart = payload.shared_claims.name[0].nameParts[2];
    namePart.value += overrides.yotiMockID;
  }

  // Unhappy path testing enabled by optional flag provided in stub paylod
  let invalidSigningKey;
  let encryptionKeyKid;
  let encryptionKey: CryptoKey;

  if (overrides?.missingSigningKid != null) {
    invalidSigningKey = crypto.randomUUID();
  }
  if (overrides?.invalidSigningKid != null) {
    invalidSigningKey = config.additionalSigningKey;
  }

  console.log("Generate payload is" + JSON.stringify(payload));
  const signedJwt = await sign(payload, config.signingKey, invalidSigningKey);

  // JWE unhappy path options
  // Generate a decryption error as payload is encrypted using a key not available to the CRI
  if (overrides?.invalidEncryptionKid) {
    const webcrypto = crypto.webcrypto as unknown as Crypto;
    const invalidEncryptionKeyId =
      config.additionalEncryptionKey.split("/").pop() ?? "";
    const invalidEncryptionKey = await getAsJwk(invalidEncryptionKeyId);
    encryptionKeyKid = invalidEncryptionKey?.kid;
    encryptionKey = await webcrypto.subtle.importKey(
      "jwk",
      invalidEncryptionKey as JsonWebKey,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
    // Happy path
  } else {
    const res = await getPublicEncryptionKeyAndKid(config);
    encryptionKey = res.publicEncryptionKey;
    encryptionKeyKid = res.kid;
  }

  const request = await encrypt(signedJwt, encryptionKey, encryptionKeyKid);

  return {
    statusCode: 200,
    body: JSON.stringify({
      request,
      responseType: "code",
      AuthorizeLocation: `${frontendURL}/oauth2/authorize?request=${request}&response_type=code&client_id=${clientID}`,
      clientId: clientID,
      sub: payload.sub,
      state: payload.state,
    }),
  };
};

export function getDefaultConfig(): {
  redirectUri: string;
  jwksUri: string;
  clientId: string;
  signingKey: string;
  additionalSigningKey: string;
  additionalEncryptionKey: string;
  frontUri: string;
  backendUri: string;
} {
  if (
    process.env.REDIRECT_URI == null ||
    process.env.JWKS_URI == null ||
    process.env.CLIENT_ID == null ||
    process.env.SIGNING_KEY == null ||
    process.env.OIDC_API_BASE_URI == null ||
    process.env.ADDITIONAL_SIGNING_KEY == null ||
    process.env.ADDITIONAL_ENCRYPTION_KEY == null ||
    process.env.OIDC_FRONT_BASE_URI == null
  ) {
    throw new Error("Missing configuration");
  }

  return {
    redirectUri: process.env.REDIRECT_URI,
    jwksUri: process.env.JWKS_URI,
    clientId: process.env.CLIENT_ID,
    signingKey: process.env.SIGNING_KEY,
    additionalSigningKey: process.env.ADDITIONAL_SIGNING_KEY,
    additionalEncryptionKey: process.env.ADDITIONAL_ENCRYPTION_KEY,
    frontUri: process.env.OIDC_FRONT_BASE_URI,
    backendUri: process.env.OIDC_API_BASE_URI,
  };
}

async function getPublicEncryptionKeyAndKid(config: {
  backendUri: string;
}): Promise<PublicEncryptionKeyAndKid> {
  const webcrypto = crypto.webcrypto as unknown as Crypto;
  const oidcProviderJwks = (
    await axios.get(`${config.backendUri}/.well-known/jwks.json`)
  ).data as Jwks;
  const publicKey = oidcProviderJwks.keys.find((key) => key.use === "enc");
  if (!publicKey) {
    throw new Error("No encryption key found");
  }
  const kid = getHashedKid(publicKey.kid);
  publicKey.kid = kid;
  const publicEncryptionKey: CryptoKey = await webcrypto.subtle.importKey(
    "jwk",
    publicKey as JsonWebKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
  const keys = { publicEncryptionKey, kid };
  return keys;
}

async function sign(
  payload: JWTPayload,
  keyId: string,
  invalidKeyId: string | undefined
): Promise<string> {
  const signingKid = keyId.split("/").pop() ?? "";
  const invalidSigningKid = invalidKeyId?.split("/").pop() ?? "";
  const kid = invalidKeyId ? invalidSigningKid : signingKid;
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

async function encrypt(
  plaintext: string,
  publicEncryptionKey: CryptoKey,
  kid: string | undefined
): Promise<string> {
  const webcrypto = crypto.webcrypto as unknown as Crypto;
  const initialisationVector = webcrypto.getRandomValues(new Uint8Array(12));
  const header = {
    alg: "RSA-OAEP-256",
    enc: "A256GCM",
    kid: kid,
  };
  const protectedHeader: string = util.base64url.encode(
    Buffer.from(JSON.stringify(header)),
    "utf8"
  );
  const aesParams: AesGcmParams = {
    additionalData: new Uint8Array(Buffer.from(protectedHeader)),
    iv: initialisationVector,
    tagLength: 128,
    name: "AES-GCM",
  };
  const cek: Uint8Array = webcrypto.getRandomValues(new Uint8Array(32));
  // asymmetric encryption
  const encryptedKey: ArrayBuffer = await webcrypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicEncryptionKey,
    cek
  );
  // Symmetric encryption
  const encoded: Uint8Array = new TextEncoder().encode(plaintext);
  const cryptoKey = await webcrypto.subtle.importKey(
    "raw",
    cek,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
  const encrypted: Uint8Array = new Uint8Array(
    await webcrypto.subtle.encrypt(aesParams, cryptoKey, encoded)
  );

  const tag: Uint8Array = encrypted.slice(-16);
  const ciphertext: Uint8Array = encrypted.slice(0, -16);

  return (
    `${protectedHeader}.` +
    `${util.base64url.encode(Buffer.from(new Uint8Array(encryptedKey)))}.` +
    `${util.base64url.encode(
      Buffer.from(new Uint8Array(initialisationVector))
    )}.` +
    `${util.base64url.encode(Buffer.from(ciphertext))}.` +
    `${util.base64url.encode(Buffer.from(tag))}`
  );
}
