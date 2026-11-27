// if you use a govuk nunjucks macro in a template and don't 'import' it here the ui will throw
import buttonMacro from "govuk-frontend/dist/govuk/components/button/macro.njk";
import buttonTemplate from "govuk-frontend/dist/govuk/components/button/template.njk";
import errorMessageMacro from "govuk-frontend/dist/govuk/components/error-message/macro.njk";
import errorMessageTemplate from "govuk-frontend/dist/govuk/components/error-message/template.njk";
import errorSummaryMacro from "govuk-frontend/dist/govuk/components/error-summary/macro.njk";
import errorSummaryTemplate from "govuk-frontend/dist/govuk/components/error-summary/template.njk";
import genericHeaderMacro from "govuk-frontend/dist/govuk/components/generic-header/macro.njk";
import genericHeaderTemplate from "govuk-frontend/dist/govuk/components/generic-header/template.njk";
import hintMacro from "govuk-frontend/dist/govuk/components/hint/macro.njk";
import hintTemplate from "govuk-frontend/dist/govuk/components/hint/template.njk";
import inputMacro from "govuk-frontend/dist/govuk/components/input/macro.njk";
import inputTemplate from "govuk-frontend/dist/govuk/components/input/template.njk";
import labelMacro from "govuk-frontend/dist/govuk/components/label/macro.njk";
import labelTemplate from "govuk-frontend/dist/govuk/components/label/template.njk";
import attributesMacro from "govuk-frontend/dist/govuk/macros/attributes.njk"; // everything uses this

export const govukTemplates: Record<string, string> = {
  "components/button/macro.njk": buttonMacro,
  "components/button/template.njk": buttonTemplate,
  "components/error-message/macro.njk": errorMessageMacro,
  "components/error-message/template.njk": errorMessageTemplate,
  "components/error-summary/macro.njk": errorSummaryMacro,
  "components/error-summary/template.njk": errorSummaryTemplate,
  "components/generic-header/macro.njk": genericHeaderMacro,
  "components/generic-header/template.njk": genericHeaderTemplate,
  "components/hint/macro.njk": hintMacro,
  "components/hint/template.njk": hintTemplate,
  "components/input/macro.njk": inputMacro,
  "components/input/template.njk": inputTemplate,
  "components/label/macro.njk": labelMacro,
  "components/label/template.njk": labelTemplate,
  "macros/attributes.njk": attributesMacro,
};
