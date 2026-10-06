export const buildQuizValidationState = (
  existing: Record<string, unknown>,
  normalizedPayload: Record<string, unknown>,
  sanitizedPayload: Record<string, unknown>,
) => ({
  ...existing,
  ...normalizedPayload,
  ...sanitizedPayload,
});
