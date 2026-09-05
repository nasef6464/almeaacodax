type QuizSubmissionReadModelContextInput = {
  skills: any[];
  subjects: any[];
  sections: any[];
};

const uniqueStrings = (values: unknown[]) => [...new Set(values.map(String).filter(Boolean))];

export const getQuizSubmissionSkillIds = (orderedQuestions: any[]) =>
  uniqueStrings(orderedQuestions.flatMap((question) => (question.skillIds || []).map(String)));

export const buildQuizSubmissionReadModelContext = ({
  skills,
  subjects,
  sections,
}: QuizSubmissionReadModelContextInput) => ({
  skillById: new Map<string, any>(
    skills.map((skill: any) => [String(skill.id || skill._id), skill] as [string, any]),
  ),
  subjectNameById: new Map(
    subjects.map((subject) => [String(subject.id || subject._id), String(subject.name || "")]),
  ),
  sectionNameById: new Map(
    sections.map((section) => [String(section.id || section._id), String(section.name || "")]),
  ),
});
