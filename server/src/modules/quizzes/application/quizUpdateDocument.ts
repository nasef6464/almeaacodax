export const buildQuizUpdateDocument = (
  normalizedPayload: Record<string, unknown>,
  resolvedSkillIds?: string[],
) => ({
  ...normalizedPayload,
  ...(resolvedSkillIds ? { skillIds: resolvedSkillIds } : {}),
});
