type RecordValue = Record<string, unknown>;

import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";

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

/**
 * Repairs only the compatibility projection and mirrored legacy-result fields.
 * It never changes the attempt, assignment, version, or the legacy result
 * itself, so a reconciliation retry cannot alter scoring or submission state.
 */
export const repairAssessmentResultFromLegacy = async (
  legacyResult: RecordValue,
  assessmentResult: RecordValue,
) => {
  const legacyQuizResultId = String(legacyResult._id || legacyResult.id || "");
  const assessmentResultId = String(assessmentResult._id || assessmentResult.id || "");
  if (!legacyQuizResultId || !assessmentResultId) {
    throw new Error("Assessment result reconciliation requires persisted legacy and assessment result identities");
  }

  return AssessmentResultModel.findByIdAndUpdate(
    assessmentResultId,
    {
      $set: {
        legacyQuizResultId,
        studentId: String(legacyResult.userId || ""),
        score: legacyResult.score,
        totalQuestions: legacyResult.totalQuestions,
        correctAnswers: legacyResult.correctAnswers,
        wrongAnswers: legacyResult.wrongAnswers,
        unanswered: legacyResult.unanswered,
        passed: legacyResult.passed,
        compatibilityProjection: legacyResult,
      },
    },
    { new: true },
  );
};
