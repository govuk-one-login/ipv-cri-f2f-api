import type { Request, Response } from "express";
import { createDynamoDbClient } from "../client/dynamo";
import { createStepFunctionsClient, credentialsProvider } from "../client/common";
import { listSessions } from "../client/list-sessions";
import { triggerCallbacks } from "../client/trigger-callbacks";
import { UI_ROOT } from "../paths";
import {
  SESSIONS_TEMPLATE,
  TRIGGER_RESULT_TEMPLATE,
  sessionsModel,
  triggerResultModel,
} from "../views/sessions-view";

const dynamoClient = createDynamoDbClient(credentialsProvider());
const stepFunctionsClient = createStepFunctionsClient();

const queryString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const get = async (req: Request, res: Response): Promise<void> => {
  const result = await listSessions(dynamoClient, queryString(req.query.nextToken));

  if (result.statusCode !== 200) {
    res
      .status(result.statusCode)
      .render(SESSIONS_TEMPLATE, sessionsModel({ error: result.body.message }));
    return;
  }

  res.render(
    SESSIONS_TEMPLATE,
    sessionsModel({
      sessions: result.body.sessions,
      nextToken: result.body.nextToken,
      truncated: result.body.truncated,
      error: queryString(req.query.error),
    }),
  );
};

// Waits (up to ~20s) for the started executions and shows how each one finished.
// Lookup failures (unknown session, no Yoti session id) redirect back to the list with the message.
const post = async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const result = await triggerCallbacks(dynamoClient, stepFunctionsClient, sessionId);

  if (!("results" in result.body)) {
    const params = new URLSearchParams({ error: result.body.message });
    res.redirect(`${res.locals.basePath}${UI_ROOT}?${params.toString()}`);
    return;
  }

  res.render(
    TRIGGER_RESULT_TEMPLATE,
    triggerResultModel({ sessionId, results: result.body.results }),
  );
};

export { get, post };
