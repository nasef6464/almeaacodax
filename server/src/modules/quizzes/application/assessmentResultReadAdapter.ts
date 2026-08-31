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

/** Resolves one result page with fixed-size batch lookups; never query per row. */
export const resolveAssessmentResultReads = (
  legacyResults: ResultRecord[],
  assessmentResultsByLegacyId: Map<string, { compatibilityProjection?: unknown }>,
  readerModesByQuizId: Map<string, string>,
) => legacyResults.map((legacyResult) => {
  const quizId = String(legacyResult.quizId || "");
  if (readerModesByQuizId.get(quizId) !== "compatibility") return legacyResult;
  const legacyId = String(legacyResult.id || legacyResult._id || "");
  return resolveAssessmentResultRead(legacyResult, assessmentResultsByLegacyId.get(legacyId));
});
