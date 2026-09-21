export const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

export const getModelDocumentId = (document: { id?: unknown; _id?: unknown }) =>
  String(document.id || document._id || "");
