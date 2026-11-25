import stylesheet from "govuk-frontend/dist/govuk/govuk-frontend.min.css";
import boldWoff2 from "govuk-frontend/dist/govuk/assets/fonts/bold-b542beb274-v2.woff2";
import lightWoff2 from "govuk-frontend/dist/govuk/assets/fonts/light-94a07e06a1-v2.woff2";
import faviconSvg from "govuk-frontend/dist/govuk/assets/images/favicon.svg";
import crestSvg from "govuk-frontend/dist/govuk/assets/images/govuk-crest.svg";
import { inlineAssets } from "../util/inline-assets";

export const govukStylesheet = inlineAssets(stylesheet, {
  lightFont: lightWoff2,
  boldFont: boldWoff2,
  crest: `data:image/svg+xml;base64,${Buffer.from(crestSvg).toString("base64")}`,
});

export const govukFavicon = faviconSvg;
