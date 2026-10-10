export const buildQuizResultLearningContextFilter = (context?: string): Record<string, unknown> => {
  if (!context) return {};
  if (context === 'legacy_unknown') return {
    $or: [{ learningContext: 'legacy_unknown' }, { learningContext: { $exists: false } }, { learningContext: null }],
  };
  return { learningContext: context };
};
