export type TeacherAssessmentDefinition = {subjectId?: unknown; mockExam?: unknown};

/** Same subject requirements for an assessment's catalog and protected report. */
export function teacherAssessmentSubjectIds(definition: TeacherAssessmentDefinition): string[] {
  const mock = definition.mockExam as {enabled?: boolean; sections?: Array<{subjectId?: unknown}>} | undefined;
  return [...new Set((mock?.enabled && mock.sections?.length
    ? mock.sections.map(section => section.subjectId || definition.subjectId)
    : [definition.subjectId]).filter(Boolean).map(String))];
}
