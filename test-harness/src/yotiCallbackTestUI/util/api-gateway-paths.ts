import { getCurrentInvoke } from "@codegenie/serverless-express";
import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      basePath: string;
    }
  }
}

// on /yoti-callback-test-ui/{proxy+} resources serverless-express uses the matched part (e.g. /yoti-callback-test-ui/sessions arrives as /sessions) so we need to reconstruct the whole path
export const routeOnFullPath = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { event } = getCurrentInvoke();

  if (event?.path) {
    const query = req.url.split("?")[1];
    req.url = query ? `${event.path}?${query}` : event.path;
  }

  next();
};

// execute-api urls include the stage (/dev/yoti-callback-test-ui) but the custom domain mapping drops it (/yoti-callback-test-ui)
// links and form actions need prefixing with basePath to work on both
export const resolveBasePath = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const stage = getCurrentInvoke().event?.requestContext?.stage;

  res.locals.basePath =
    stage && req.hostname.endsWith(".amazonaws.com") ? `/${stage}` : "";

  next();
};
