import { AssessmentAssignmentModel } from "../infrastructure/assessmentAssignmentModel.js";
import { AssessmentAttemptModel } from "../infrastructure/assessmentAttemptModel.js";
import { AssessmentResponseModel } from "../infrastructure/assessmentResponseModel.js";
import { AssessmentResultModel } from "../infrastructure/assessmentResultModel.js";
import { AssessmentVersionModel } from "../infrastructure/assessmentVersionModel.js";

export const dualWriteAssessmentSubmission = async ({ quiz, legacyResult, answers }: any) => {
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
  const attempt = await AssessmentAttemptModel.findOneAndUpdate(
    { submissionKey: legacyResult.submissionKey },
    { $setOnInsert: { assignmentId: String(assignment._id), assessmentVersionId: String(version._id), studentId: String(legacyResult.userId), attemptNumber: legacyResult.attemptNumber, status: "submitted", submittedAt: legacyResult.createdAt || new Date(), submissionKey: legacyResult.submissionKey } },
    { new: true, upsert: true },
  );
  await Promise.all(Object.entries(answers || {}).map(([questionId, answer]) => AssessmentResponseModel.findOneAndUpdate({ attemptId: String(attempt._id), questionId }, { $set: { studentId: String(legacyResult.userId), answer, savedAt: new Date() } }, { upsert: true })));
  return AssessmentResultModel.findOneAndUpdate(
    { legacyQuizResultId: String(legacyResult._id) },
    { $setOnInsert: { attemptId: String(attempt._id), assignmentId: String(assignment._id), assessmentVersionId: String(version._id), studentId: String(legacyResult.userId), legacyQuizResultId: String(legacyResult._id), score: legacyResult.score, totalQuestions: legacyResult.totalQuestions, correctAnswers: legacyResult.correctAnswers, wrongAnswers: legacyResult.wrongAnswers, unanswered: legacyResult.unanswered, passed: legacyResult.passed, sectionResults: legacyResult.sectionResults || [], compatibilityProjection: legacyResult } },
    { new: true, upsert: true },
  );
};
