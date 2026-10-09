/** Derive only the teacher's assigned classes intersecting an explicit audience. */
export const teacherAssessmentClassIds = (
  assessment: { targetGroupIds?: unknown[]; targetUserIds?: unknown[] },
  schoolId: string,
  assignments: Array<{ classId: string; students: Array<{ studentId: string }> }>,
): string[] => {
  const groups = new Set((assessment.targetGroupIds || []).map(String));
  const students = new Set((assessment.targetUserIds || []).map(String));
  return [...new Set(assignments.filter((assignment) =>
    groups.has(schoolId) || groups.has(assignment.classId) ||
    assignment.students.some((student) => students.has(student.studentId)),
  ).map((assignment) => assignment.classId))];
};
