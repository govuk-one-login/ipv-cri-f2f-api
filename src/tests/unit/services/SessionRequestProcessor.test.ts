import { SessionRequestProcessor } from "../../../services/SessionRequestProcessor";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { F2fService } from "../../../services/F2fService";
import { VALID_SESSION } from "../data/session-events";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";
import { JWTPayload } from "jose";
import { Jwt } from "../../../utils/IVeriCredential";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { ISessionItem } from "../../../models/ISessionItem";

/* eslint @typescript-eslint/unbound-method: 0 */
/* eslint jest/unbound-method: error */

let sessionRequestProcessor: SessionRequestProcessor;
const mockF2fService = mock<F2fService>();
const mockKmsJwtAdapter = mock<KmsJwtAdapter>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();
const mockValidationHelper = mock<ValidationHelper>();

const decodedJwtFactory = ():Jwt => {
  return {
    header: {
      alg: "mock",
    },
    payload: {
      govuk_signin_journey_id: "abcdef",
    },
    signature: "signature",
  };
};

const decryptedJwtPayloadFactory = ():JWTPayload => {
  return {
    iss: "mock",
    sub: "mock",
    aud: "mock",
    jti: "mock",
    nbf: 1234,
    exp: 5678,
    iat: 1234,
  };
};

describe("SessionRequestProcessor", () => {
  beforeAll(() => {
    sessionRequestProcessor = new SessionRequestProcessor(logger, metrics);
    // @ts-ignore
    sessionRequestProcessor.f2fService = mockF2fService;
    // @ts-ignore
    sessionRequestProcessor.kmsDecryptor = mockKmsJwtAdapter;
    // @ts-ignore
    sessionRequestProcessor.validationHelper = mockValidationHelper;
  });

  // the test below fails as the session processor is not writing the expiryDate value correctly in
  // seconds, it is writing it in ms. To be fixed in separate ticket
  it("the session created should have a valid expiryDate", async () => {
    // Arrange
    mockKmsJwtAdapter.decrypt.mockResolvedValue("success");
    mockKmsJwtAdapter.decode.mockReturnValue(decodedJwtFactory());
    mockKmsJwtAdapter.verifyWithJwks.mockResolvedValue(decryptedJwtPayloadFactory());
    mockValidationHelper.isJwtValid.mockReturnValue("");
    mockF2fService.getSessionById.mockResolvedValue(undefined);
    mockF2fService.createAuthSession.mockResolvedValue();
    mockF2fService.savePersonIdentity.mockRejectedValue("error");
    jest.useFakeTimers();
    const fakeTime = 1684933200.123;
    jest.setSystemTime(new Date(fakeTime * 1000)); // 2023-05-24T13:00:00.000Z

    // Act
    await sessionRequestProcessor.processRequest(VALID_SESSION);

    // Assert
    expect(mockF2fService.createAuthSession).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        expiryDate: Math.floor(fakeTime + +process.env.AUTH_SESSION_TTL!),
      }),
    );
    // the next assertion checks that the value has no more than 10 digits, i.e. is in secs not ms
    // this will break in the year 2286!
    const actualExpiryDate = mockF2fService.createAuthSession.mock.calls[0][0].expiryDate;
    expect(actualExpiryDate).toBeLessThan(10000000000);
    jest.useRealTimers();
  });
});
