export type QuizJourneySource = 'foundation' | 'training' | 'tests' | 'mock-exam' | 'course' | 'self' | string;

type QuizRouteContext = {
  returnTo?: string;
  source?: QuizJourneySource;
  returnOnFinish?: boolean;
  courseId?: string;
  courseLessonId?: string;
};

export const isSafeInternalRoute = (target?: string) => {
  if (!target) return false;
  return target.startsWith('/') && !target.startsWith('//');
};

export const buildQuizRouteWithContext = (quizId: string, context: QuizRouteContext | null = {}) => {
  const safeContext = context || {};
  const params = new URLSearchParams();

  if (isSafeInternalRoute(safeContext.returnTo)) {
    params.set('returnTo', safeContext.returnTo as string);
  }

  if (safeContext.source) {
    params.set('source', safeContext.source);
  }

  if (safeContext.returnOnFinish) {
    params.set('returnOnFinish', '1');
  }

  if (safeContext.courseId) {
    params.set('courseId', safeContext.courseId);
  }

  if (safeContext.courseLessonId) {
    params.set('courseLessonId', safeContext.courseLessonId);
  }

  const query = params.toString();
  return `/quiz/${quizId}${query ? `?${query}` : ''}`;
};
