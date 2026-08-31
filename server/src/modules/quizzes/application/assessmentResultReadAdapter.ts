type ResultRecord = Record<string, unknown>;

export const resolveAssessmentResultRead = (
  legacyResult: ResultRecord,
  assessmentResult?: { compatibilityProjection?: unknown } | null,
): ResultRecord => {
  const projection = assessmentResult?.compatibilityProjection;
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) return legacyResult;

  return {
    ...legacyResult,
    ...(projection as ResultRecord),
    _id: legacyResult._id,
    id: legacyResult.id ?? legacyResult._id,
    userId: legacyResult.userId,
  };
};
