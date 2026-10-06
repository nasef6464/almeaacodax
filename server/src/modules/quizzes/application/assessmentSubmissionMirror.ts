import { AssessmentMirrorAuditModel } from "../infrastructure/assessmentMirrorAuditModel.js";
import { dualWriteAssessmentSubmission } from "./dualWriteAssessmentSubmission.js";

type AssessmentLike = Record<string, any>;

export function shouldMirrorAssessmentSubmission(quiz: AssessmentLike) {
  const explicitlyEnabled = quiz?.assessmentData?.mirrorSubmissions === true;
  const isMock = quiz?.quizKind === "mock" || quiz?.mockExam?.enabled === true;
  const isDirected = (quiz?.targetGroupIds || []).length > 0 || (quiz?.targetUserIds || []).length > 0;
  return explicitlyEnabled && (isMock || isDirected);
}

function failureDetails(error: unknown) {
  const value = error as { code?: unknown; message?: unknown };
  return {
    failureCode: String(value?.code || "ASSESSMENT_MIRROR_FAILED"),
    failureMessage: String(value?.message || "Assessment mirror failed").slice(0, 500),
  };
}

/**
 * Runs only after the legacy QuizResult has committed. A mirror failure is
 * deliberately contained: the legacy submission remains the accepted source
 * of truth and an audit row makes divergence observable and repairable.
 */
export async function mirrorAssessmentSubmissionAfterLegacyResult({
  quiz,
  legacyResult,
  answers,
}: {
  quiz: AssessmentLike;
  legacyResult: AssessmentLike;
  answers: Record<string, unknown>;
}) {
  if (!shouldMirrorAssessmentSubmission(quiz)) return { status: "skipped" as const };

  const legacyQuizResultId = String(legacyResult._id || legacyResult.id || "");
  const assessmentId = String(quiz.id || quiz._id || "");
  try {
    const result = await dualWriteAssessmentSubmission({ quiz, legacyResult, answers });
    await AssessmentMirrorAuditModel.findOneAndUpdate(
      { legacyQuizResultId },
      {
        $set: {
          assessmentId,
          submissionKey: String(legacyResult.submissionKey || ""),
          status: "completed",
          failureCode: "",
          failureMessage: "",
          completedAt: new Date(),
          failedAt: undefined,
        },
      },
      { upsert: true, new: true },
    );
    return { status: "completed" as const, result };
  } catch (error) {
    const failure = failureDetails(error);
    try {
      await AssessmentMirrorAuditModel.findOneAndUpdate(
        { legacyQuizResultId },
        {
          $set: {
            assessmentId,
            submissionKey: String(legacyResult.submissionKey || ""),
            status: "failed",
            ...failure,
            failedAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (auditError) {
      console.error("[assessments] mirror audit persistence failed", {
        assessmentId,
        legacyQuizResultId,
        error: failureDetails(auditError).failureMessage,
      });
    }
    console.error("[assessments] legacy result mirrored incompletely", {
      assessmentId,
      legacyQuizResultId,
      error: failure.failureMessage,
    });
    return { status: "failed" as const, ...failure };
  }
}
