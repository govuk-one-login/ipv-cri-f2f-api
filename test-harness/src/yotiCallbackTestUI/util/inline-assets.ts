export const LIGHT_FONT_URL = "/assets/fonts/light-94a07e06a1-v2.woff2";
export const BOLD_FONT_URL = "/assets/fonts/bold-b542beb274-v2.woff2";
export const CREST_URL = "/assets/images/govuk-crest.svg";

type DataUris = {
  lightFont: string;
  boldFont: string;
  crest: string;
};

// the govuk stylesheet points at `/assets/*` which is not actually hosted anywhere so we inline as data URIs instead
export const inlineAssets = (
  css: string,
  { lightFont, boldFont, crest }: DataUris,
): string =>
  css
    .replaceAll(LIGHT_FONT_URL, lightFont)
    .replaceAll(BOLD_FONT_URL, boldFont)
    .replaceAll(CREST_URL, crest)
    .replace(/,url\(\/assets\/fonts\/[^)]+\.woff\) format\("woff"\)/g, "");
