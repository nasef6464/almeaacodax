type Question = { questionId: string; skillIds?: string[] };
type Response = { studentId: string; questionId: string; isCorrect: boolean };

/** Derive staff-only evidence from questions actually sent, without querying per student. */
export function buildClassroomStudentReports(input: {
  studentIds: string[]; joinedStudentIds: Set<string>; names: Map<string, string>;
  questions: Question[]; publishedQuestionIds: string[]; responses: Response[];
}) {
  const published = new Set(input.publishedQuestionIds.map(String));
  const questions = new Map(input.questions.filter(q => published.has(String(q.questionId))).map(q => [String(q.questionId), q]));
  const skillQuestions = new Map<string, number>();
  for (const question of questions.values()) {
    for (const skillId of new Set((question.skillIds || []).filter(Boolean))) {
      skillQuestions.set(skillId, (skillQuestions.get(skillId) || 0) + 1);
    }
  }
  const responsesByStudent = new Map<string, Map<string, Response>>();
  for (const response of input.responses) {
    const questionId = String(response.questionId);
    if (!questions.has(questionId)) continue;
    const studentId = String(response.studentId);
    const rows = responsesByStudent.get(studentId) || new Map<string, Response>();
    rows.set(questionId, response);
    responsesByStudent.set(studentId, rows);
  }
  return [...new Set(input.studentIds)].map(studentId => {
    const rows = responsesByStudent.get(studentId) || new Map<string, Response>();
    const skillEvidence = new Map<string, { answered: number; correct: number }>();
    let correct = 0;
    for (const [questionId, response] of rows) {
      if (response.isCorrect) correct++;
      for (const skillId of new Set((questions.get(questionId)?.skillIds || []).filter(Boolean))) {
        const evidence = skillEvidence.get(skillId) || { answered: 0, correct: 0 };
        evidence.answered++;
        if (response.isCorrect) evidence.correct++;
        skillEvidence.set(skillId, evidence);
      }
    }
    const answered = rows.size;
    return {
      studentId, name: input.names.get(studentId) || "طالب", joined: input.joinedStudentIds.has(studentId),
      publishedQuestions: questions.size, answered, correct, wrong: answered - correct,
      unanswered: Math.max(0, questions.size - answered),
      accuracy: answered ? Math.round(correct / answered * 100) : null,
      skills: [...skillQuestions].map(([skillId, count]) => {
        const evidence = skillEvidence.get(skillId) || { answered: 0, correct: 0 };
        return { skillId, questions: count, ...evidence, wrong: evidence.answered - evidence.correct,
          unanswered: Math.max(0, count - evidence.answered),
          accuracy: evidence.answered ? Math.round(evidence.correct / evidence.answered * 100) : null };
      }),
    };
  });
}
