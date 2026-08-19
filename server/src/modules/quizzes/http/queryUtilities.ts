export const buildQuizResultsCacheKey = (
  userId: string,
  originalUrl: string,
  includeReview: boolean,
) => `${userId}:${includeReview ? "review" : "list"}:${originalUrl}`;

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseDateFilter = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};
