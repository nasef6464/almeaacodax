import type { QuizResult } from '../../../types';

/** One current outcome per student and assessment; historical attempts remain saved. */
export const latestAssessmentResults = (results: QuizResult[]) => {
  const latest = new Map<string, QuizResult>();
  for (const result of results) {
    if (!result.userId) continue;
    const key = JSON.stringify([result.quizId, result.userId]);
    const previous = latest.get(key);
    if (!previous || new Date(result.date).getTime() > new Date(previous.date).getTime()) latest.set(key, result);
  }
  return Array.from(latest.values());
};

type ReportGroup = { id: string; studentIds?: string[] };
type ReportStudent = { id: string; groupIds?: string[]; schoolId?: string | null };
type ReportQuiz = { targetUserIds?: string[]; targetGroupIds?: string[] };

/** Explicit audiences narrow a report, never widen the staff member's allowed scope. */
export const assessmentReportStudentIds = (
  quizzes: ReportQuiz[], allowedIds: string[], groups: ReportGroup[], students: ReportStudent[],
) => {
  const allowed = new Set(allowedIds);
  const targeted = new Set<string>();
  for (const quiz of quizzes) {
    const groupIds = new Set(quiz.targetGroupIds || []);
    const userIds = quiz.targetUserIds || [];
    if (!groupIds.size && !userIds.length) return Array.from(allowed);
    userIds.forEach(id => { if (allowed.has(id)) targeted.add(id); });
    groups.filter(group => groupIds.has(group.id)).forEach(group =>
      (group.studentIds || []).forEach(id => { if (allowed.has(id)) targeted.add(id); }),
    );
    students.forEach(student => {
      if (allowed.has(student.id) && ((student.groupIds || []).some(id => groupIds.has(id)) ||
        (!!student.schoolId && groupIds.has(student.schoolId)))) targeted.add(student.id);
    });
  }
  return Array.from(targeted);
};

export const studentBelongsToReportGroup = (student: ReportStudent, group: ReportGroup) =>
  (group.studentIds || []).includes(student.id) || (student.groupIds || []).includes(group.id) || student.schoolId === group.id;
