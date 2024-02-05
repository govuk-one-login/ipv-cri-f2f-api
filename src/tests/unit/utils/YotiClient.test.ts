import { createYotiService } from "../../../utils/YotiClient";
import { YotiService } from "../../../services/YotiService";
import { AppError } from "../../../utils/AppError";
import { EnvironmentVariables } from "../../../services/EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { mock } from "jest-mock-extended";


jest.mock("../../../services/YotiService");
const mockEnvironmentVariables = mock<EnvironmentVariables>();
const logger = new Logger();

describe('createYotiService', () => {
  const sessionClientId = 'test-client-id';
  const YOTI_PRIVATE_KEY = 'test-private-key';
  const clientConfig = [{
    jwksEndpoint: 'https://example.com/jwks',
    clientId: 'test-client-id',
    redirectUri: 'https://example.com/redirect',
    YOTIBASEURL: 'https://api.yoti.com',
    YOTISDK: 'yoti-sdk-id'
  },
	{
    jwksEndpoint: 'https://nonmatch.yoti.com/jwks',
    clientId: "123445",
    redirectUri: 'https://nonmatch.yoti.com/redirect',
    YOTIBASEURL: 'https://nonmatch.yoti.api.yoti.com',
    YOTISDK: 'nonmatch.yoti-sdk-id'
  }];

  beforeEach(() => {
    mockEnvironmentVariables.clientConfig.mockReturnValue(JSON.stringify(clientConfig));
    mockEnvironmentVariables.resourcesTtlInSeconds.mockReturnValue(3600);
    mockEnvironmentVariables.clientSessionTokenTtlInDays.mockReturnValue(1);
  });

  it.only('creates a YotiService instance with valid config', () => {
    const yotiService = createYotiService(sessionClientId, YOTI_PRIVATE_KEY, mockEnvironmentVariables, logger);

		// expect(logger.info).toHaveBeenCalledWith({message: "Creating Yoti Service"});

    // expect(YotiService.getInstance).toHaveBeenCalledWith(
    //   logger,
    //   "yoti-sdk-id",
    //   3600,
    //   1,
    //   'test-private-key',
    //   "https://api.yoti.com"
    // );

    expect(yotiService).toBeInstanceOf(YotiService);
  });

  it('throws an AppError when config is missing', () => {
    mockEnvironmentVariables.clientConfig.mockReturnValue(JSON.stringify([])); // No matching client config

    expect(() => createYotiService(sessionClientId, YOTI_PRIVATE_KEY, mockEnvironmentVariables, logger))
      .toThrow(AppError);
    expect(() => createYotiService(sessionClientId, YOTI_PRIVATE_KEY, mockEnvironmentVariables, logger))
      .toThrow('Missing YOTI Config');
  });

});
