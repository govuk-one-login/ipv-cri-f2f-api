import axios from "axios";
import { handler } from "../handlers/startF2fCheck";
import {
  expect,
  jest,
  it,
  beforeEach,
  afterEach,
  describe,
} from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import format from "ecdsa-sig-formatter";
import base64url from "base64url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import testData from "../events/startEvents.js";

jest.setTimeout(30000);

const mockJwks = {
  keys: [
    {
      kty: "EC",
      x: "lQ8yEvZF5s0Dq22uy8yVTQ4v17O_W4_Q9GdIU_QEnEU",
      y: "O1snym8cBxAWcCVkecKkpD1m7caeJWgMx6VFRz7HolM",
      crv: "P-256",
      use: "sig",
      kid: "ce69575a-c31b-4c45-b6e5-8dea4611d453",
      alg: "ES256",
    },
    {
      kty: "RSA",
      n: "0d4C16pyGlryLFDbmw_OqThVCkeB5IjW1qfHLYj-dSOmgYKFktw_BWCD2kjkA69SvX6R4OxRTb4c6Xn3DnyxNJBK7oX9XZYUaTWZy_Fs3lbaCE22u60KARECLQCbijxFCfFQn8Pz0eBnaFyEg36wT_FbktGWtIDwAd0G79Y1FCMt9G9ri-LOT8N542vQXsFxzq6l6lCcf4zRPrMj-tarMIp0Vk3goLeN_1vN9zjlHCB0xMXCv2jiKnJp6OJxqJVqU6oaWG-Ob9DC5XtSlTn5VX_QbAJGgmmhioSfGq1mTUzaZRw3dhPT9Hbguo5yMUHjB-8zl4auvigfaCjbOMisKQ",
      e: "AQAB",
      use: "enc",
      kid: "569c43c6-8136-42c9-932d-fbcdddbfd778",
      alg: "RSA-OAEP-256",
    },
  ],
};

process.env.REDIRECT_URI = "test.com/callback";
process.env.CLIENT_ID = "test-id";
process.env.SIGNING_KEY = "key-id";
process.env.ADDITIONAL_SIGNING_KEY = "additional-signing-key-id";
process.env.ADDITIONAL_ENCRYPTION_KEY = "additional-encryption-key-id";
process.env.OIDC_API_BASE_URI = "api-target.com";
process.env.OIDC_FRONT_BASE_URI = "test-target.com";

const kmsClient = mockClient(KMSClient);

describe("Start F2F Check Endpoint", () => {
  beforeEach(() => {
    // TODO: Make response fixed for stronger test assertions
    // webcrypto.getRandomValues = () => {
    //     return new Uint8Array([ 197, 213, 5, 202, 58, 74, 45, 36, 122, 168, 27, 155, 70, 15, 9, 123, 11, 241, 205, 87, 23, 13, 32, 168, 12, 73, 48, 158, 96, 159, 247, 211 ])
    // }
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z
    jest.spyOn(axios, "get").mockResolvedValue({ data: mockJwks });

    kmsClient.on(SignCommand).resolves({
      Signature: new Uint8Array([
        197, 213, 5, 202, 58, 74, 45, 36, 122, 168, 27, 155, 70, 15, 9, 123, 11,
        241, 205, 87, 23, 13, 32, 168, 12, 73, 48, 158, 96, 159, 247, 211,
      ]),
    });

    jest
      .spyOn(format, "derToJose")
      .mockReturnValue(
        "PmBhykH4w94xj3dSDSR-tE5XSh60SjKAP6hHGc6c_fx7ia87hEkKgfhSTCT000RaDhH0MaV47FsUjztCb0m1qg"
      );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("returns JAR data and target uri", async () => {
    const response = await handler(testData.startDefault);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();

    const body = JSON.parse(response.body);
    const [protectedHeaderBase64] = body.request.split(".");
    const protectedHeader = JSON.parse(base64url.decode(protectedHeaderBase64));

    expect(body.request).toBeDefined();
    expect(body.responseType).toBeDefined();
    expect(body.clientId).toBeDefined();
    expect(body.AuthorizeLocation).toBeDefined();
    expect(protectedHeader).toHaveProperty("alg");
    expect(protectedHeader).toHaveProperty("enc");
    expect(protectedHeader).toHaveProperty("kid");
  });

  it("returns JAR data and target uri with custom payload", async () => {
    const response = await handler(testData.startCustom);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();

    const body = JSON.parse(response.body);
    const [protectedHeaderBase64] = body.request.split(".");
    const protectedHeader = JSON.parse(base64url.decode(protectedHeaderBase64));

    expect(body.request).toBeDefined();
    expect(body.responseType).toBeDefined();
    expect(body.clientId).toBeDefined();
    expect(body.AuthorizeLocation).toBeDefined();
    expect(protectedHeader).toHaveProperty("alg");
    expect(protectedHeader).toHaveProperty("enc");
    expect(protectedHeader).toHaveProperty("kid");
  });

  describe("Sign function", () => {
    it("should sign the JWT using the correct key", async () => {
      const response = await handler(testData.startDefault);
      const signCommandInput =
        kmsClient.commandCalls(SignCommand)[0].args[0].input;
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });

    it("should sign a JWT using the correct key when provided with a custom payload for 'invalidSigningKid'", async () => {
      const response = await handler(testData.startCustomInvalidSigningKey);
      const signCommandInput =
        kmsClient.commandCalls(SignCommand)[0].args[0].input;
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });

    it("should sign a JWT using the correct key when provided with a custom payload for 'missingSigningKid'", async () => {
      const response = await handler(testData.startCustomMissingSigningKey);
      const signCommandInput =
        kmsClient.commandCalls(SignCommand)[0].args[0].input;
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });
  });
});
