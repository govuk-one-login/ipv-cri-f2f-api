export type ErrorMap = Record<string, string | undefined>;

export const errorModel = (
  errors: ErrorMap,
  fieldIds: Record<string, string>,
) => ({
  errors: Object.fromEntries(
    Object.entries(errors).map(([field, text]) => [field, { text }]),
  ),
  errorList: Object.entries(errors).map(([field, text]) => ({
    text,
    href: fieldIds[field] ? `#${fieldIds[field]}` : undefined,
  })),
});
