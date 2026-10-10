import { QuizModel } from '../../../models/Quiz.js';
import { buildDocumentQuery } from '../infrastructure/quizDocumentQuery.js';
import { canSubmitQuiz, resolveDirectedQuizReadAccess } from './quizAccessPolicy.js';
import { resolveAuthUserByAuthId } from './quizUserLookup.js';
import { getQuizQuestionIds } from './quizQuestionSelection.js';
import { resolveQuizSubmissionLearningContext } from './quizSubmissionLearningContext.js';

/** Reporting metadata only: grading and mastery evidence remain unchanged. */
export const resolveQuestionActivityProvenance = async (payload: {
  activityType?: string; quizId?: string; source?: string;
}, userId: string, question: any) => {
  if (payload.activityType !== 'quiz') {
    return { ok: true as const, metadata: {
      activityType: payload.activityType || 'legacy_unknown',
      ...(payload.activityType ? { learningContext: 'platform_self_study' } : {}),
    } };
  }
  const quiz = await QuizModel.findOne(buildDocumentQuery(payload.quizId!)).select(
    'id questionIds mockExam.sections.questionIds mockExam.enabled quizKind type pathId subjectId targetUserIds targetGroupIds createdBy isPublished approvalStatus showOnPlatform access learningPlacements showInTraining showInMock placement',
  ).lean();
  if (!quiz) return { ok: false as const, status: 404, message: 'Quiz not found' };
  const user = await resolveAuthUserByAuthId(userId);
  if (!user) return { ok: false as const, status: 404, message: 'User not found' };
  const directed = await resolveDirectedQuizReadAccess(quiz, { id: userId });
  if (!directed.allowed || !(await canSubmitQuiz(quiz, user, payload.source))) {
    return { ok: false as const, status: 403, message: 'This quiz is not available to you' };
  }
  const questionIds = new Set([String(question.id || question._id), String(question._id)]);
  if (!getQuizQuestionIds(quiz).some(id => questionIds.has(String(id)))) {
    return { ok: false as const, status: 400, message: 'Question is not part of this quiz' };
  }
  const context = await resolveQuizSubmissionLearningContext({ quiz, learnerId: userId, learnerSchoolId: user.schoolId });
  return { ok: true as const, metadata: {
    activityType: context.learningContext === 'platform_self_study' && (quiz.quizKind === 'drill' || quiz.type === 'bank') ? 'practice' : 'quiz',
    quizId: String(quiz.id || quiz._id), ...context,
  } };
};
