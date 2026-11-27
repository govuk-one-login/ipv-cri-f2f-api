import type { SessionSummary } from "../client/list-sessions";
import type { TopicResult, TopicStatus } from "../client/trigger-callbacks";
import { errorModel } from "./error-model";

export const SESSIONS_TEMPLATE = "sessions.njk";
export const TRIGGER_RESULT_TEMPLATE = "trigger-result.njk";

const toIsoString = (epochSeconds: number | undefined): string | undefined =>
  epochSeconds === undefined
    ? undefined
    : new Date(epochSeconds * 1000).toISOString().slice(0, 19).replace("T", " ");

export const sessionsModel = ({
  sessions = [],
  nextToken,
  truncated = false,
  error,
}: {
  sessions?: SessionSummary[];
  nextToken?: string;
  truncated?: boolean;
  error?: string;
}) => ({
  title: "Yoti callback test UI",
  sessions: sessions.map((session) => ({
    ...session,
    createdDate: toIsoString(session.createdDate),
    expiryDate: toIsoString(session.expiryDate),
  })),
  nextToken,
  truncated,
  ...errorModel(error === undefined ? {} : { form: error }, {}),
});

const TAG_COLOURS: Record<TopicStatus, string> = {
  SUCCEEDED: "govuk-tag--green",
  RUNNING: "govuk-tag--blue",
  FAILED: "govuk-tag--red",
  TIMED_OUT: "govuk-tag--red",
  ABORTED: "govuk-tag--red",
  NOT_STARTED: "govuk-tag--red",
};

// The cause of a failed Lambda task is a JSON document; surface its message when we can
const causeMessage = (cause: string | undefined): string | undefined => {
  if (cause === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(cause);
    if (typeof parsed === "object" && parsed !== null && "errorMessage" in parsed) {
      return String((parsed as { errorMessage: unknown }).errorMessage);
    }
  } catch {
    // not JSON, show as is
  }
  return cause;
};

export const triggerResultModel = ({
  sessionId,
  results,
}: {
  sessionId: string;
  results: TopicResult[];
}) => ({
  title: "Yoti callbacks triggered",
  sessionId,
  results: results.map((result) => ({
    topic: result.topic,
    status: result.status,
    tagClass: TAG_COLOURS[result.status],
    executionArn: result.executionArn,
    error: result.error,
    detail: causeMessage(result.cause),
  })),
  anyRunning: results.some((result) => result.status === "RUNNING"),
  anyFailed: results.some(
    (result) => result.status !== "SUCCEEDED" && result.status !== "RUNNING",
  ),
});
