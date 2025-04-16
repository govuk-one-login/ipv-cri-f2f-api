/* eslint-disable @typescript-eslint/unbound-method */
import { ExpiredSessionsProcessor } from "../../../services/ExpiredSessionsProcessor";
import { F2fService } from "../../../services/F2fService";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";

describe("ExpiredSessionsProcessor", () => {
  let expiredSessionsProcessor: ExpiredSessionsProcessor;
  const mockF2fService = mock<F2fService>();
  const mockLogger = mock<Logger>();
  const mockMetrics = mock<Metrics>();

  const F2FSessionsWithYotiSession = [
    {
      subject: "9a1e98b9-5118-423f-9137-972d33bccf7b",
      createdDate: 1714558620,
      sessionId: "1b655a2e-44e4-4b21-a626-7825abd9c93e",
      expiryDate: 1718381130000,
      authSessionState: "F2F_YOTI_SESSION_CREATED",
      expiredNotificationSent: false,
    },
    {
      subject: "8a2e98b9-5118-423f-9137-972d33bccf7c",
      createdDate: 1714558620,
      sessionId: "2b655a2e-44e4-4b21-a626-7825abd9c93f",
      expiryDate: 1708381130000,
      authSessionState: "F2F_AUTH_CODE_ISSUED",
      expiredNotificationSent: true,
    },
    {
      subject: "7a3e98b9-5118-423f-9137-972d33bccf7d",
      createdDate: 1714558620,
      sessionId: "3b655a2e-44e4-4b21-a626-7825abd9c93g",
      expiryDate: 1608381130000,
      authSessionState: "F2F_ACCESS_TOKEN_ISSUED",
      expiredNotificationSent: false,
    },
    {
      subject: "6a4e98b9-5118-423f-9137-972d33bccf7e",
      createdDate: 1714558620,
      sessionId: "4b655a2e-44e4-4b21-a626-7825abd9c93h",
      expiryDate: 1618381130000,
      authSessionState: "F2F_YOTI_SESSION_CREATED",
      expiredNotificationSent: false,
    },
    {
      subject: "5a5e98b9-5118-423f-9137-972d33bccf7f",
      createdDate: 2034504966,
      sessionId: "5b655a2e-44e4-4b21-a626-7825abd9c93i",
      expiryDate: 1518381130000,
      authSessionState: "F2F_AUTH_CODE_ISSUED",
      expiredNotificationSent: true,
    },
  ];

  beforeAll(() => {
    expiredSessionsProcessor = new ExpiredSessionsProcessor(
      mockLogger,
      mockMetrics,
    );
    // @ts-expect-error linting to be updated
    expiredSessionsProcessor.f2fService = mockF2fService;
    mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(
      F2FSessionsWithYotiSession,
    );
    mockF2fService.sendToIPVCore.mockResolvedValue();
    mockF2fService.markSessionAsExpired.mockResolvedValue();
  });

  it("should send message to IPVCore for expired sessions", async () => {
    const result = await expiredSessionsProcessor.processRequest();

    expect(result).toEqual({ statusCode: 200, body: "Success" });
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      1,
      "Total num. of user sessions to send expired notifications:",
      { numOfExpiredSessions: 3 },
    );
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      2,
      "Successfully sent error message to IPV Core Queue",
      {
        count: 3,
        sessions: [
          "1b655a2e-44e4-4b21-a626-7825abd9c93e",
          "3b655a2e-44e4-4b21-a626-7825abd9c93g",
          "4b655a2e-44e4-4b21-a626-7825abd9c93h",
        ],
      },
    );
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      3,
      "Sessions marked as Expired",
      {
        count: 3,
        sessions: [
          "1b655a2e-44e4-4b21-a626-7825abd9c93e",
          "3b655a2e-44e4-4b21-a626-7825abd9c93g",
          "4b655a2e-44e4-4b21-a626-7825abd9c93h",
        ],
      },
    );
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      4,
      "All expired session notifications have been processed.",
    );
    expect(mockF2fService.getSessionsByAuthSessionStates).toHaveBeenCalledWith(
      [
        "F2F_YOTI_SESSION_CREATED",
        "F2F_AUTH_CODE_ISSUED",
        "F2F_ACCESS_TOKEN_ISSUED",
      ],
      "expiredCheck-index",
    );
    expect(mockMetrics.addMetric).toHaveBeenCalledWith(
      "ExpiredSession_Time_to_visit_PO_has_expired",
      MetricUnits.Count,
      1,
    );
    expect(mockF2fService.sendToIPVCore).toHaveBeenNthCalledWith(1, {
      sub: "9a1e98b9-5118-423f-9137-972d33bccf7b",
      state: undefined,
      error: "access_denied",
      error_description: "Time given to visit PO has expired",
    });
    expect(mockF2fService.sendToIPVCore).toHaveBeenNthCalledWith(2, {
      sub: "7a3e98b9-5118-423f-9137-972d33bccf7d",
      state: undefined,
      error: "access_denied",
      error_description: "Time given to visit PO has expired",
    });
    expect(mockF2fService.sendToIPVCore).toHaveBeenNthCalledWith(3, {
      sub: "6a4e98b9-5118-423f-9137-972d33bccf7e",
      state: undefined,
      error: "access_denied",
      error_description: "Time given to visit PO has expired",
    });
    expect(mockF2fService.sendToIPVCore).toHaveBeenCalledTimes(3);
    expect(mockF2fService.markSessionAsExpired).toHaveBeenNthCalledWith(
      1,
      "1b655a2e-44e4-4b21-a626-7825abd9c93e",
    );
    expect(mockF2fService.markSessionAsExpired).toHaveBeenNthCalledWith(
      2,
      "3b655a2e-44e4-4b21-a626-7825abd9c93g",
    );
    expect(mockF2fService.markSessionAsExpired).toHaveBeenNthCalledWith(
      3,
      "4b655a2e-44e4-4b21-a626-7825abd9c93h",
    );
    expect(mockF2fService.markSessionAsExpired).toHaveBeenCalledTimes(3);
  });

  it("should log if no users with specific session states", async () => {
    mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue([]);

    const result = await expiredSessionsProcessor.processRequest();

    expect(result).toEqual({
      statusCode: 200,
      body: "No Session Records matching state",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "No users with session states F2F_YOTI_SESSION_CREATED,F2F_AUTH_CODE_ISSUED,F2F_ACCESS_TOKEN_ISSUED",
    );
  });

  it("should log if no sessions older than specified TTL", async () => {
    mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue([
      {
        subject: "9a1e98b9-5118-423f-9137-972d33bccf7z",
        createdDate: 1695708788000, // Recent date
        sessionId: "1b655a2e-44e4-4b21-a626-7825abd9c93e",
        expiryDate: 1695708788000,
        authSessionState: "F2F_YOTI_SESSION_CREATED",
        expiredNotificationSent: false,
      },
    ]);

    const result = await expiredSessionsProcessor.processRequest();

    expect(result).toEqual({
      statusCode: 200,
      body: "No Sessions older than specified TTL",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "No users with session states F2F_YOTI_SESSION_CREATED,F2F_AUTH_CODE_ISSUED,F2F_ACCESS_TOKEN_ISSUED older than 11 days",
    );
  });

  it("should handle error during processing", async () => {
    mockF2fService.getSessionsByAuthSessionStates.mockRejectedValue(
      new Error("Error"),
    );

    const result = await expiredSessionsProcessor.processRequest();

    expect(result.statusCode).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unexpected error accessing session table",
      {
        error: new Error("Error"),
        messageCode: "FAILED_FETCHING_SESSIONS",
      },
    );
  });

  it("should log an error if not able to set the expired notification flag", async () => {
    mockF2fService.markSessionAsExpired.mockRejectedValueOnce(
      new Error("Unable to set expired notification flag"),
    );
    mockF2fService.getSessionsByAuthSessionStates.mockResolvedValue(
      F2FSessionsWithYotiSession,
    );

    await expiredSessionsProcessor.processRequest();

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Failed to set expired notification flag",
      {
        error: new Error("Unable to set expired notification flag"),
        sessionId: expect.any(String),
      },
    );
  });

  it("should throw an error if not able to access session table", async () => {
    mockF2fService.getSessionsByAuthSessionStates.mockRejectedValueOnce(
      new Error("Permission Denied"),
    );

    await expiredSessionsProcessor.processRequest();

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Unexpected error accessing session table",
      {
        error: new Error("Permission Denied"),
        messageCode: "FAILED_FETCHING_SESSIONS",
      },
    );
  });
});
