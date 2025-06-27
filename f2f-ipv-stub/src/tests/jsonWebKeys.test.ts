import { KMSClient, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { handler } from "../handlers/jsonWebKeys";
import { mockClient } from "aws-sdk-client-mock";
import { APIGatewayProxyResult } from "aws-lambda";

describe("JWKS Endpoint", () => {
  const mockKmsClient = mockClient(KMSClient);

  beforeEach(() => {
    process.env.SIGNING_KEY = "test1";
    process.env.ADDITIONAL_SIGNING_KEY = "test2";
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

  it("provides at least two signing keys", async () => {
    const response = await handler();
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();

    const jwks = JSON.parse(response.body);
    expect(jwks.keys).toBeDefined();
    expect(jwks.keys.length >= 2).toBe(true);
    expect(jwks.keys.find((k: any) => k.use === "sig")).toBeDefined();
  });

  it("should return a 200 response with an empty JWK array if no keys are provided", async () => {
    delete process.env.SIGNING_KEY;
    delete process.env.ADDITIONAL_SIGNING_KEY;
    const response = await handler();
    const result = response as APIGatewayProxyResult;
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? "{}");
    expect(body.keys).toHaveLength(0);
  });

  it("should return a 200 response with an empty JWK array if the key retrieval fails", async () => {
    mockKmsClient
      .on(GetPublicKeyCommand)
      .rejects(new Error("Failed to fetch key"));
    const response = (await handler()) as APIGatewayProxyResult;
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body ?? "{}");
    expect(body.keys).toHaveLength(0);
  });
});
