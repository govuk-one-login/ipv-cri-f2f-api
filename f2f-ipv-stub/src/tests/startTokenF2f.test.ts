import { handler } from "../handlers/startTokenF2f";
import {
  expect,
  jest,
  it,
  beforeEach,
  afterEach,
  describe,
} from "@jest/globals";
import { mockClient } from "aws-sdk-client-mock";
import "aws-sdk-client-mock-jest";
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";
import format from "ecdsa-sig-formatter";

const testData = require("../events/startEvents.js")

jest.setTimeout(30000);

process.env.SIGNING_KEY = "key-id";
process.env.ADDITIONAL_KEY = "additional-key-id";

const kmsClient = mockClient(KMSClient);

describe("Start BAV Check Endpoint", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z

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

  it("returns JWT data", async () => {
    const response = await handler(testData.startDefault);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();
  });

  describe("Sign function", () => {
    it("should sign the JWT using the correct key", async () => {
      const response = await handler(testData.startDefault);
      const signCommandInput = kmsClient.commandCalls(SignCommand)[0].args[0].input; 
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });

    it("should sign a JWT using the correct key when provided with a custom payload for 'invalidKid'", async () => {
      const response = await handler(testData.startCustomInvalidSigningKey);
      const signCommandInput = kmsClient.commandCalls(SignCommand)[0].args[0].input; 
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });

    it("should sign a JWT using the correct key when provided with a custom payload for 'missingKid'", async () => {
      const response = await handler(testData.startCustomMissingSigningKey);
      const signCommandInput = kmsClient.commandCalls(SignCommand)[0].args[0].input; 
      expect(signCommandInput.KeyId).toBe("key-id");
      expect(response.statusCode).toBe(200);
    });
  })
});