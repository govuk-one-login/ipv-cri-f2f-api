import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { handler } from "../handlers/jsonWebKeys";
import { mockClient } from "aws-sdk-client-mock";

describe("JWKS Endpoint", () => {
  beforeEach(() => {
    process.env.SIGNING_KEY = "test";
    const mockKmsClient = mockClient(KMSClient);
    mockKmsClient.on(GetPublicKeyCommand).resolves({
      KeyId: "test",
      PublicKey: Buffer.from(
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAES4sDJifz8h3GDznZZ6NC3QN5qlQn8Zf2mck4yBmlwqvXzZu7Wkwc4QuOxXhGHXamfkoG5d0UJVXJwwvFxiSzRQ==",
        "base64"
      ),
      CustomerMasterKeySpec: "ECC_NIST_P256",
      KeySpec: "ECC_NIST_P256",
      KeyUsage: "SIGN_VERIFY",
      SigningAlgorithms: ["ECDSA_SHA_256"],
    });
  });

  it("provides at least one signing key", async () => {
    const response = await handler();
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();

    const jwks = JSON.parse(response.body);
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length >= 1).toBe(true);
    expect(jwks.keys.find((k) => k.use === "sig")).toBeDefined();
  });
});
