import type { QuizResult, StudyPlan } from '../types';

export const getPlanQuizCompletion = (plan: StudyPlan, results: QuizResult[]) => {
  const completed = new Set(results.map(result => String(result.quizId)));
  const completedDuringPlan = new Set(results.filter(result => {
    const date = Date.parse(result.date);
    return Number.isFinite(date) && date >= plan.createdAt;
  }).map(result => String(result.quizId)));
  return {
    completed,
    shouldSkip: (quizId: string) => plan.skipCompletedQuizzes && completed.has(quizId) && !completedDuringPlan.has(quizId),
  };
};

type Task = { id: string; type: 'lesson' | 'quiz' | 'resource'; completed: boolean; scheduledDate: string; link?: string; external?: boolean };

/** References have no recorded completion and never dilute learning progress. */
export const getPlanProgress = (tasks: Task[]) => {
  const unique = [...new Map(tasks.filter(task => task.type !== 'resource').map(task => [task.id, task])).values()];
  const completed = unique.filter(task => task.completed).length;
  return { total: unique.length, completed, percent: unique.length ? Math.round(completed / unique.length * 100) : 0 };
};

export const getNextPlanTask = <T extends Task>(tasks: T[], today: string): T | undefined => {
  const pending = tasks.filter(task => !task.completed && task.type !== 'resource' && task.link && !task.external);
  return pending.find(task => task.scheduledDate === today) || pending.find(task => task.scheduledDate < today) || pending[0];
};
