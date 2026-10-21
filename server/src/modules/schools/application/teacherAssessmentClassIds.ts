import {teacherAssessmentSubjectIds, type TeacherAssessmentDefinition} from '../../quizzes/application/teacherAssessmentSubjects.js';
import {resolveTeacherMaterial} from './teacherMaterialPolicy.js';

/** Intersect the audience with the report's existing same-class subject scope. */
export const teacherAssessmentClassIds = (
  assessment: TeacherAssessmentDefinition & { targetGroupIds?: unknown[]; targetUserIds?: unknown[] },
  schoolId: string,
  assignments: Array<{ classId: string; subjectId?: string; students: Array<{ studentId: string }> }>,
): string[] => {
  const groups = new Set((assessment.targetGroupIds || []).map(String));
  const students = new Set((assessment.targetUserIds || []).map(String));
  const subjects = teacherAssessmentSubjectIds(assessment);
  if(resolveTeacherMaterial(assignments).state!=='ready'||!subjects.length)return [];
  return [...new Set(assignments.filter((assignment) =>
    subjects.every(subject => assignments.some(candidate => candidate.classId === assignment.classId && candidate.subjectId === subject)) &&
    (groups.has(schoolId) || groups.has(assignment.classId) ||
    assignment.students.some((student) => students.has(student.studentId))),
  ).map((assignment) => assignment.classId))];
};
