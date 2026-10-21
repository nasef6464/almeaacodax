import {TeachingAssignmentModel} from '../../../models/TeachingAssignment.js';
import {SubjectModel} from '../../../models/Subject.js';
import {resolveTeacherMaterial,questionMatchesTeacherMaterial,type TeacherMaterial} from './teacherMaterialPolicy.js';
export async function loadTeacherMaterial(actor:{id:string;role:string},schoolId:string,classId?:string):Promise<TeacherMaterial|null> {
  const assignments=await TeachingAssignmentModel.find({teacherId:actor.id,schoolId,status:'active'}).select('subjectId classId').lean();
  const scope=resolveTeacherMaterial(assignments as any[]);
  if(scope.state!=='ready'||(classId&&!assignments.some(a=>String(a.classId)===classId)))return null;
  const subject=await SubjectModel.findById(scope.subjectId).select('name pathId').lean() as any;
  return {ids:[...new Set([scope.subjectId,subject?.id,subject?._id?.toString()].filter(Boolean))],name:subject?.name,pathId:subject?.pathId};
}
export async function teacherCanReadClassroom(actor:{id:string;role:string},session:any) {
  if(actor.role!=='teacher')return true;
  const scope=await loadTeacherMaterial(actor,String(session.schoolId),String(session.classId));
  return Boolean(scope&&(session.questionSnapshots||[]).every((q:any)=>questionMatchesTeacherMaterial(scope,q)));
}
export async function teacherAssignmentMaterialError(payload:{teacherId:string;schoolId:string;classId:string;subjectId?:string;status:string}):Promise<string|null> {
  if(payload.status!=='active')return null;
  if(!String(payload.subjectId||'').trim())return 'اختر مادة المعلم أولًا؛ التكليف العام لا يتيح جميع المواد.';
  const other=await TeachingAssignmentModel.exists({teacherId:payload.teacherId,schoolId:payload.schoolId,status:'active',subjectId:{$nin:[payload.subjectId,'',null]}});
  return other?'للمعلم مادة أخرى في هذه المدرسة. أوقف التكليف السابق قبل تغيير المادة.':null;
}
