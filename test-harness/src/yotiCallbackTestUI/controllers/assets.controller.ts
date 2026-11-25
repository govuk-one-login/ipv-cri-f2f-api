import type { Request, Response } from "express";
import { govukFavicon, govukStylesheet } from "../assets/govuk";

const IMMUTABLE = "public, max-age=31536000, immutable";

const getStylesheet = (_req: Request, res: Response): void => {
  res.type("text/css").set("Cache-Control", IMMUTABLE).send(govukStylesheet);
};

const getFavicon = (_req: Request, res: Response): void => {
  res.type("image/svg+xml").set("Cache-Control", IMMUTABLE).send(govukFavicon);
};

export { getStylesheet, getFavicon };
