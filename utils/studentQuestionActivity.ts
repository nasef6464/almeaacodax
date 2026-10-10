import type { QuestionAttempt } from '../types';

export const buildStudentActivitySummary = (attempts: QuestionAttempt[]) => {
  const summary = { practice: 0, review: 0, platformQuiz: 0, schoolQuiz: 0, unknown: 0 };
  for (const attempt of attempts) {
    if (!(attempt.selectedOptionIndex >= 0)) continue;
    if (attempt.activityType === 'quiz') {
      if (attempt.learningContext === 'school_assessment') summary.schoolQuiz++;
      else if (attempt.learningContext === 'platform_self_study') summary.platformQuiz++;
      else summary.unknown++;
    } else if (attempt.activityType === 'practice') summary.practice++;
    else if (attempt.activityType === 'review' || ['remediation', 'recheck', 'mastery_review'].includes(attempt.evidenceType || '')) summary.review++;
    else summary.unknown++;
  }
  return summary;
};
