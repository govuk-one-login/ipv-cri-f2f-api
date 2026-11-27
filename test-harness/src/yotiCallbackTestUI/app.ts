import express, { type Express } from "express";
import { routes } from "./routes";
import { resolveBasePath, routeOnFullPath } from "./util/api-gateway-paths";
import { configureNunjucksViews } from "./views/nunjucks";

export const createApp = (): Express => {
  const app = express();

  configureNunjucksViews(app);
  app.use(routeOnFullPath);
  app.use(resolveBasePath);
  app.use(express.urlencoded({ extended: false }));
  app.use(routes());

  return app;
};
