type ResultRecord = Record<string, unknown>;

/** Re-apply the lightweight list boundary after compatibility overlays. */
export const projectQuizResultHistory = (result: ResultRecord): ResultRecord => {
  const { questionReview: _review, quizSnapshot, ...light } = result;
  if (!quizSnapshot || typeof quizSnapshot !== 'object' || Array.isArray(quizSnapshot)) return light;
  const snapshot = quizSnapshot as ResultRecord;
  return { ...light, quizSnapshot: Object.fromEntries(
    ['title', 'mode', 'quizKind', 'pathId', 'subjectId'].filter(key => key in snapshot).map(key => [key, snapshot[key]]),
  ) };
};

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
    // List filters use the persisted origin, never a stale compatibility copy.
    learningContext: legacyResult.learningContext ?? 'legacy_unknown',
    schoolId: legacyResult.schoolId,
    classId: legacyResult.classId,
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
