type QuizSubmissionReadModelContextInput = {
  skills: any[];
  subjects: any[];
  sections: any[];
};

const uniqueStrings = (values: unknown[]) => [...new Set(values.map(String).filter(Boolean))];

export const getQuizSubmissionSkillIds = (orderedQuestions: any[]) =>
  uniqueStrings(orderedQuestions.flatMap((question) => (question.skillIds || []).map(String)));

const expandSkillRows = (skills: any[]) =>
  skills.flatMap((skill: any) => {
    const parentId = String(skill.id || skill._id || "");
    const parentRow = parentId ? [[parentId, skill] as [string, any]] : [];
    const subRows = (Array.isArray(skill.subSkills) ? skill.subSkills : [])
      .map((subSkill: any) => {
        const subSkillId = String(subSkill?.id || "").trim();
        if (!subSkillId) return null;
        return [
          subSkillId,
          {
            ...subSkill,
            id: subSkillId,
            parentSkillId: parentId,
            pathId: String(skill.pathId || ""),
            subjectId: String(skill.subjectId || ""),
            sectionId: String(skill.sectionId || ""),
          },
        ] as [string, any];
      })
      .filter((row: [string, any] | null): row is [string, any] => Boolean(row));

    return [...parentRow, ...subRows];
  });

export const buildQuizSubmissionReadModelContext = ({
  skills,
  subjects,
  sections,
}: QuizSubmissionReadModelContextInput) => ({
  skillById: new Map<string, any>(expandSkillRows(skills)),
  subjectNameById: new Map(
    subjects.map((subject) => [String(subject.id || subject._id), String(subject.name || "")]),
  ),
  sectionNameById: new Map(
    sections.map((section) => [String(section.id || section._id), String(section.name || "")]),
  ),
});
