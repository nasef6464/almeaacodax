type QuizSubmissionReadModelContextInput = {
  skills: any[];
  subjects: any[];
  sections: any[];
};

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const toPlainSkillValue = (value: any) => {
  if (!value) return {};
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

/**
 * New question records have authoritative `skillId` + `subSkillId`.
 * Prefer those fields so a stale legacy `skillIds` entry cannot leak an
 * unrelated skill into one student's result. Legacy rows without canonical
 * fields still fall back to `skillIds`.
 */
export const getCanonicalQuestionSkillIds = (question: any) => {
  const canonical = uniqueStrings([question?.skillId, question?.subSkillId]);
  return canonical.length > 0
    ? canonical
    : uniqueStrings(Array.isArray(question?.skillIds) ? question.skillIds : []);
};

export const getQuizSubmissionSkillIds = (orderedQuestions: any[]) =>
  uniqueStrings(orderedQuestions.flatMap((question) => getCanonicalQuestionSkillIds(question)));

const buildSkillLookup = (skills: any[]) => {
  const rows: Array<[string, any]> = [];

  for (const rawSkill of skills) {
    // Mongoose Documents do not expose schema paths through object spread.
    // Convert first so persisted result/SkillProgress rows retain the actual
    // taxonomy name instead of falling back to "مهارة غير مسماة".
    const skill = toPlainSkillValue(rawSkill);
    const parentSkillId = String(skill?.id || skill?._id || rawSkill?.id || rawSkill?._id || "").trim();
    if (!parentSkillId) continue;

    rows.push([
      parentSkillId,
      {
        ...skill,
        id: parentSkillId,
        name: String(skill?.name || rawSkill?.name || ""),
        level: "main",
        parentSkillId: "",
        parentSkill: "",
      },
    ]);

    for (const rawSubSkill of Array.isArray(skill?.subSkills) ? skill.subSkills : []) {
      const subSkill = toPlainSkillValue(rawSubSkill);
      const subSkillId = String(subSkill?.id || rawSubSkill?.id || "").trim();
      if (!subSkillId) continue;
      rows.push([
        subSkillId,
        {
          ...subSkill,
          id: subSkillId,
          name: String(subSkill?.name || rawSubSkill?.name || ""),
          pathId: skill.pathId,
          subjectId: skill.subjectId,
          sectionId: skill.sectionId,
          level: "sub",
          parentSkillId,
          parentSkill: String(skill.name || rawSkill?.name || ""),
        },
      ]);
    }
  }

  return new Map<string, any>(rows);
};

export const buildQuizSubmissionReadModelContext = ({
  skills,
  subjects,
  sections,
}: QuizSubmissionReadModelContextInput) => ({
  skillById: buildSkillLookup(skills),
  subjectNameById: new Map(
    subjects.map((subject) => [String(subject.id || subject._id), String(subject.name || "")]),
  ),
  sectionNameById: new Map(
    sections.map((section) => [String(section.id || section._id), String(section.name || "")]),
  ),
});
