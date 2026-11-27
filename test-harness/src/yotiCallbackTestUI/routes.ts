import { Router } from "express";
import asyncify from "express-asyncify";
import { sessionsController, assetsController } from "./controllers";
import {
  FAVICON_PATH,
  STYLESHEET_PATH,
  TRIGGER_CALLBACKS_ROUTE,
  UI_ROOT,
} from "./paths";

export const routes = (): Router => {
  // Express 4 does not catch rejected promises from async handlers; asyncify forwards them to the error handler
  const router = asyncify(Router());

  router.get(STYLESHEET_PATH, assetsController.getStylesheet);
  router.get(FAVICON_PATH, assetsController.getFavicon);

  router.get(UI_ROOT, sessionsController.get);
  router.post(TRIGGER_CALLBACKS_ROUTE, sessionsController.post);

  return router;
};
