import { InteractiveVideoProgress } from '../types';

export type InteractiveVideoProgressState = Pick<InteractiveVideoProgress, 'positionSeconds' | 'answeredQuestionIds'>;

export const normalizeInteractiveVideoProgress = (
  courseId: string,
  lessonId: string,
  state: InteractiveVideoProgressState,
  updatedAt = Date.now(),
): InteractiveVideoProgress => ({
  courseId: String(courseId || '').trim(),
  lessonId: String(lessonId || '').trim(),
  positionSeconds: Math.max(0, Math.min(86_400, Math.floor(Number(state.positionSeconds) || 0))),
  answeredQuestionIds: Array.from(new Set((state.answeredQuestionIds || []).map(String).filter(Boolean))).slice(0, 100),
  updatedAt,
});

export const mergeInteractiveVideoProgress = (
  items: InteractiveVideoProgress[],
  next: InteractiveVideoProgress,
) => [next, ...items.filter((item) => item.courseId !== next.courseId || item.lessonId !== next.lessonId)]
  .sort((first, second) => second.updatedAt - first.updatedAt)
  .slice(0, 100);
