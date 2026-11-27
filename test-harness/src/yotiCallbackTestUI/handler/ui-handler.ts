import serverlessExpress from "@codegenie/serverless-express";
import { createApp } from "../app";

export const lambdaHandler = serverlessExpress({
  app: createApp(),
  binarySettings: { isBinary: false },
});
