const idOf = (student: any) => String(student.id || student._id || "");

/** An unopened/skipped question is not evidence of weak performance. */
export const studentHasAssessmentEvidence = (
  student: any,
  resultsByStudent: Map<string, any[]>,
  attemptsByStudent: Map<string, any[]>,
) => (resultsByStudent.get(idOf(student)) || []).length > 0 ||
  (attemptsByStudent.get(idOf(student)) || []).some((attempt) => Number(attempt.selectedOptionIndex ?? -1) >= 0);

export const unassessedStudentSummaries = (
  students: any[], resultsByStudent: Map<string, any[]>, attemptsByStudent: Map<string, any[]>,
) => students.filter((student) => !studentHasAssessmentEvidence(student, resultsByStudent, attemptsByStudent))
  .map((student) => ({ id: idOf(student), name: String(student.name || "طالب"), groupIds: (student.groupIds || []).map(String) }));
