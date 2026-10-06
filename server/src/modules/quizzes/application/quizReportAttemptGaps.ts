export type QuizReportAttempt = {
  skillIds?: unknown;
  pathId?: unknown;
  subjectId?: unknown;
  sectionId?: unknown;
  isCorrect?: unknown;
};

export type QuizReportSkill = {
  id?: unknown;
  _id?: unknown;
  name?: unknown;
  pathId?: unknown;
  subjectId?: unknown;
  sectionId?: unknown;
};

export type QuizReportAttemptGap = {
  skillId: string;
  skill: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
  subjectName: string;
  section: string;
  mastery: number;
};

/** Converts one persisted question attempt into the report's skill-gap read model. */
export const buildQuizReportAttemptGaps = (
  attempt: QuizReportAttempt,
  skillById: Map<string, QuizReportSkill>,
  subjectNameById: Map<string, string>,
  sectionNameById: Map<string, string>,
): QuizReportAttemptGap[] => (Array.isArray(attempt.skillIds) ? attempt.skillIds : [])
  .map((skillId: unknown) => {
    const resolvedSkill = skillById.get(String(skillId));
    if (!resolvedSkill) return null;

    const subjectId = String(resolvedSkill.subjectId || attempt.subjectId || "");
    const sectionId = String(resolvedSkill.sectionId || attempt.sectionId || "");
    return {
      skillId: String(resolvedSkill.id || resolvedSkill._id || skillId),
      skill: String(resolvedSkill.name || "مهارة غير مسماة"),
      pathId: String(resolvedSkill.pathId || attempt.pathId || ""),
      subjectId,
      sectionId,
      subjectName: subjectNameById.get(subjectId) || "",
      section: sectionNameById.get(sectionId) || sectionId,
      mastery: attempt.isCorrect ? 100 : 0,
    };
  })
  .filter((gap): gap is QuizReportAttemptGap => Boolean(gap));
