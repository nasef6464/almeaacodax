type Context = { schoolId: string; classId: string };
type Response = { sessionId: unknown; questionId: unknown; studentId: unknown; isCorrect?: boolean };
type Count = { evidenceCount: number; correct: number };
const accuracy = (value: Count) => value.evidenceCount ? Math.round(value.correct * 100 / value.evidenceCount) : null;

/** Reuses already authorized, bounded classroom reads; never combines a student's different class contexts. */
export function classroomStudentSkillEvidence(
  responses: Response[], contexts: Map<string, Context>, questionSkills: Map<string, string[]>, names: Map<string, string>,
) {
  const students = new Map<string, Context & Count & {studentId: string; name: string; skills: Map<string, Count>}>();
  for (const response of responses) {
    const sessionId = String(response.sessionId || '');
    const context = contexts.get(sessionId);
    const studentId = String(response.studentId || '');
    if (!context?.schoolId || !context.classId || !studentId) continue;
    const key = JSON.stringify([studentId, context.schoolId, context.classId]);
    const student = students.get(key) || {...context, studentId, name: names.get(studentId) || 'طالب', evidenceCount: 0, correct: 0, skills: new Map<string, Count>()};
    student.evidenceCount++;
    if (response.isCorrect) student.correct++;
    for (const skillId of new Set(questionSkills.get(`${sessionId}:${String(response.questionId || '')}`) || [])) {
      if (!skillId) continue;
      const skill = student.skills.get(skillId) || {evidenceCount: 0, correct: 0};
      skill.evidenceCount++;
      if (response.isCorrect) skill.correct++;
      student.skills.set(skillId, skill);
    }
    students.set(key, student);
  }
  return [...students.values()].map(student => ({...student, accuracy: accuracy(student),
    skills: [...student.skills].map(([skillId, count]) => ({skillId, ...count, accuracy: accuracy(count)}))
      .sort((a,b) => (a.accuracy ?? 101) - (b.accuracy ?? 101) || b.evidenceCount - a.evidenceCount),
  })).sort((a,b) => (a.accuracy ?? 101) - (b.accuracy ?? 101) || b.evidenceCount - a.evidenceCount);
}
