import {TeachingAssignmentModel} from '../../../models/TeachingAssignment.js';
import {resolveSchoolDirectoryScope} from '../../schools/application/schoolDirectoryScope.js';

export type TeacherAssessmentDefinition={subjectId?:unknown;mockExam?:unknown};
export async function resolveTeacherAssessmentClassIds(actor:any,definition:TeacherAssessmentDefinition,directoryScope?:Awaited<ReturnType<typeof resolveSchoolDirectoryScope>>){
  const actorId=String(actor.id||actor._id||'');
  const [candidates,directory]=await Promise.all([
    TeachingAssignmentModel.find({teacherId:actorId,status:'active'}).select('schoolId classId subjectId').lean(),
    directoryScope?Promise.resolve(directoryScope):resolveSchoolDirectoryScope({...actor,id:actorId}),
  ]);
  const assignments=candidates.filter(assignment=>directory.groups.some(group=>group.type==='CLASS'&&
    String(group._id)===assignment.classId&&String(group.parentId)===assignment.schoolId));
  const mock=definition.mockExam as any;
  const subjects=[...new Set((mock?.enabled&&mock.sections?.length?mock.sections.map((section:any)=>section.subjectId||definition.subjectId):[definition.subjectId]).filter(Boolean).map(String))];
  return [...new Set(assignments.map(a=>a.classId))].filter(classId=>directory.groupIds.includes(classId)&&subjects.every(subject=>
    assignments.some(a=>a.classId===classId&&(!a.subjectId||a.subjectId===subject))));
}
