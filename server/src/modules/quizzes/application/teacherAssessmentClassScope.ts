import {TeachingAssignmentModel} from '../../../models/TeachingAssignment.js';
import {resolveSchoolDirectoryScope} from '../../schools/application/schoolDirectoryScope.js';
import {teacherAssessmentSubjectIds, type TeacherAssessmentDefinition} from './teacherAssessmentSubjects.js';

export type {TeacherAssessmentDefinition} from './teacherAssessmentSubjects.js';
export async function resolveTeacherAssessmentClassIds(actor:any,definition:TeacherAssessmentDefinition,directoryScope?:Awaited<ReturnType<typeof resolveSchoolDirectoryScope>>){
  const actorId=String(actor.id||actor._id||'');
  const [candidates,directory]=await Promise.all([
    TeachingAssignmentModel.find({teacherId:actorId,status:'active'}).select('schoolId classId subjectId').lean(),
    directoryScope?Promise.resolve(directoryScope):resolveSchoolDirectoryScope({...actor,id:actorId}),
  ]);
  const assignments=candidates.filter(assignment=>directory.groups.some(group=>group.type==='CLASS'&&
    String(group._id)===assignment.classId&&String(group.parentId)===assignment.schoolId));
  const subjects=teacherAssessmentSubjectIds(definition);
  return [...new Set(assignments.map(a=>a.classId))].filter(classId=>directory.groupIds.includes(classId)&&subjects.every(subject=>
    assignments.some(a=>a.classId===classId&&(!a.subjectId||a.subjectId===subject))));
}
