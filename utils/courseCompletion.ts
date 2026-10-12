import type { Course } from '../types';
export const getCourseCompletion = (course: Pick<Course, 'modules'>, completedIds: unknown[]) => {
  const required = new Set((course.modules || []).flatMap(module => module.lessons || [])
    .map(lesson => String(lesson.id || (lesson as { _id?: unknown })._id || '').trim()).filter(Boolean));
  const done = new Set(completedIds.map(String));
  const completed = [...required].filter(id => done.has(id)).length;
  const total = required.size;
  return { total, completed, roundedPercent: total ? Math.round(completed / total * 100) : 0, isComplete: total > 0 && completed === total };
};
