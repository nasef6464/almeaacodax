type RecordValue = Record<string, unknown>;

const comparableFields = ["userId", "score", "totalQuestions", "correctAnswers", "wrongAnswers", "unanswered", "passed"] as const;

export const reconcileAssessmentResult = (
  legacyResult: RecordValue,
  assessmentResult: RecordValue,
): string[] => {
  const differences: string[] = [];
  if (String(assessmentResult.legacyQuizResultId || "") !== String(legacyResult._id || legacyResult.id || "")) {
    differences.push("legacyQuizResultId");
  }
  if (String(assessmentResult.studentId || "") !== String(legacyResult.userId || "")) {
    differences.push("studentId");
  }
  for (const field of comparableFields.slice(1)) {
    if (assessmentResult[field] !== legacyResult[field]) differences.push(field);
  }
  return differences;
};
