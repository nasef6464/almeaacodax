export type ClassroomCompetitionResponse = {
  studentId: string;
  isCorrect?: boolean;
  submittedAt?: Date | string | null;
};

export type ClassroomCompetitionStanding = {
  studentId: string;
  answered: number;
  correct: number;
  accuracy: number;
  score: number;
  lastSubmittedAt: Date | null;
};

export const buildClassroomCompetitionStandings = (
  responses: ClassroomCompetitionResponse[],
): ClassroomCompetitionStanding[] => {
  const byStudent = new Map<string, Omit<ClassroomCompetitionStanding, "accuracy" | "score">>();

  responses.forEach((response) => {
    const studentId = String(response.studentId);
    const current = byStudent.get(studentId) || {
      studentId,
      answered: 0,
      correct: 0,
      lastSubmittedAt: null,
    };
    current.answered += 1;
    if (response.isCorrect) current.correct += 1;
    const submittedAt = response.submittedAt ? new Date(response.submittedAt) : null;
    if (submittedAt && (!current.lastSubmittedAt || submittedAt > current.lastSubmittedAt)) {
      current.lastSubmittedAt = submittedAt;
    }
    byStudent.set(studentId, current);
  });

  return Array.from(byStudent.values())
    .map((entry) => ({
      ...entry,
      accuracy: entry.answered > 0 ? Math.round((entry.correct / entry.answered) * 100) : 0,
      score: entry.correct * 100,
    }))
    .sort(
      (a, b) =>
        b.correct - a.correct ||
        b.answered - a.answered ||
        new Date(a.lastSubmittedAt || 0).getTime() - new Date(b.lastSubmittedAt || 0).getTime(),
    );
};
