import { AssessmentAssignmentModel } from "../infrastructure/assessmentAssignmentModel.js";
import { AssessmentAttemptModel } from "../infrastructure/assessmentAttemptModel.js";
import { AssessmentResponseModel } from "../infrastructure/assessmentResponseModel.js";
import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";
import { AssessmentVersionModel } from "../infrastructure/assessmentVersionModel.js";

type DualWriteDependencies = {
  upsertResponse?: (input: {
    attemptId: string;
    questionId: string;
    studentId: string;
    answer: unknown;
  }) => Promise<unknown>;
};

export const dualWriteAssessmentSubmission = async ({
  quiz,
  legacyResult,
  answers,
  dependencies,
}: any & { dependencies?: DualWriteDependencies }) => {
  const assessmentId = String(quiz.id || quiz._id);
  const version = await AssessmentVersionModel.findOneAndUpdate(
    { assessmentId, version: 1 },
    { $setOnInsert: { definition: quiz, publishedBy: String(quiz.createdBy || "system"), status: "published" } },
    { new: true, upsert: true },
  );
  const assignment = await AssessmentAssignmentModel.findOneAndUpdate(
    { assessmentId, assessmentVersionId: String(version._id) },
    { $setOnInsert: { audience: { groupIds: quiz.targetGroupIds || [], userIds: quiz.targetUserIds || [] }, maxAttempts: Number(quiz.settings?.maxAttempts || 1), createdBy: String(quiz.createdBy || "system") } },
    { new: true, upsert: true },
  );
  const attemptContext = {
    assignmentId: String(assignment._id),
    assessmentVersionId: String(version._id),
    studentId: String(legacyResult.userId),
    attemptNumber: Number(legacyResult.attemptNumber || 1),
  };

  // A runner can create the lifecycle attempt before the legacy submit route
  // commits its result. Reuse that exact attempt, including an expired/ended
  // one, rather than colliding with its canonical student+assignment number.
  // The submission key remains the idempotency key for retried final submits.
  let attempt = legacyResult.submissionKey
    ? await AssessmentAttemptModel.findOne({ submissionKey: legacyResult.submissionKey })
    : null;
  if (!attempt) {
    attempt = await AssessmentAttemptModel.findOneAndUpdate(
      attemptContext,
      { $set: { status: "submitted", submittedAt: legacyResult.createdAt || new Date(), submissionKey: legacyResult.submissionKey } },
      { new: true },
    );
  }
  if (!attempt) {
    try {
      attempt = await AssessmentAttemptModel.create({
        ...attemptContext,
        status: "submitted",
        submittedAt: legacyResult.createdAt || new Date(),
        submissionKey: legacyResult.submissionKey,
      });
    } catch (error: any) {
      if (error?.code !== 11000 || !legacyResult.submissionKey) throw error;
      attempt = await AssessmentAttemptModel.findOne({ submissionKey: legacyResult.submissionKey });
      if (!attempt) throw error;
    }
  }
  const upsertResponse = dependencies?.upsertResponse || ((input: {
    attemptId: string;
    questionId: string;
    studentId: string;
    answer: unknown;
  }) => AssessmentResponseModel.findOneAndUpdate(
    { attemptId: input.attemptId, questionId: input.questionId },
    { $set: { studentId: input.studentId, answer: input.answer, savedAt: new Date() } },
    { upsert: true },
  ));
  await Promise.all(Object.entries(answers || {}).map(([questionId, answer]) => upsertResponse({
    attemptId: String(attempt._id),
    questionId,
    studentId: String(legacyResult.userId),
    answer,
  })));
  return AssessmentResultModel.findOneAndUpdate(
    { legacyQuizResultId: String(legacyResult._id) },
    { $setOnInsert: { attemptId: String(attempt._id), assignmentId: String(assignment._id), assessmentVersionId: String(version._id), studentId: String(legacyResult.userId), legacyQuizResultId: String(legacyResult._id), score: legacyResult.score, totalQuestions: legacyResult.totalQuestions, correctAnswers: legacyResult.correctAnswers, wrongAnswers: legacyResult.wrongAnswers, unanswered: legacyResult.unanswered, passed: legacyResult.passed, sectionResults: legacyResult.sectionResults || [], compatibilityProjection: legacyResult } },
    { new: true, upsert: true },
  );
};
