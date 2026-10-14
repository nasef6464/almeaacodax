import {UserModel} from '../../../models/User.js';
import {PathModel} from '../../../models/Path.js';
import {SubjectModel} from '../../../models/Subject.js';
import {SkillModel} from '../../../models/Skill.js';
import {buildDocumentQuery} from '../infrastructure/quizDocumentQuery.js';
import {resolveSchoolDirectoryScope} from '../../schools/application/schoolDirectoryScope.js';
import {requireSchoolDirectorCapability} from '../../schools/application/schoolDirectorAccess.js';
import {resolveTeacherAssessmentClassIds} from './teacherAssessmentClassScope.js';
import {selectSchoolBankQuestions} from '../infrastructure/schoolAssessmentBankRepository.js';
import type {CompositionContext,SchoolCompositionSpec} from './schoolAssessmentComposition.js';
const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};

export async function resolveSchoolCompositionContext(principal:{id?:unknown;_id?:unknown},spec:SchoolCompositionSpec):Promise<CompositionContext>{
  const stored=await UserModel.findOne(buildDocumentQuery(String(principal.id||principal._id||''))).setOptions({strictQuery:false}).lean();
  if(!stored||stored.isActive===false||!['admin','supervisor','teacher','school_admin'].includes(stored.role))fail(403,'Active school staff required');
  const actor={...stored!,id:String((stored as any).id||stored!._id)};
  const directory=await resolveSchoolDirectoryScope(actor);
  if(actor.role==='supervisor'&&!directory.schoolIds.length&&!directory.groupIds.length)fail(403,'School authoring scope required');
  if(actor.role==='school_admin'&&(!actor.schoolId||!await requireSchoolDirectorCapability(actor.id,actor.schoolId,'SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_ASSESSMENTS')))
    fail(403,'School assessment management permission and module required');
  if(actor.role==='teacher'&&!(await resolveTeacherAssessmentClassIds(actor,{subjectId:spec.subjectSpecs[0].subjectId,
    mockExam:{enabled:true,sections:spec.subjectSpecs.map(s=>({subjectId:s.subjectId}))}},directory)).length)
    fail(403,'Every selected subject must be assigned in an active class');
  if(!await PathModel.exists({_id:spec.pathId,isActive:{$ne:false}}))fail(404,'Active learning path required');
  const subjectIds=spec.subjectSpecs.map(s=>s.subjectId);
  const subjects=await SubjectModel.find({_id:{$in:subjectIds},pathId:spec.pathId}).select('_id name').lean();
  if(subjects.length!==subjectIds.length)fail(400,'Subjects must belong to the selected path');
  const skills=await SkillModel.find({pathId:spec.pathId,subjectId:{$in:subjectIds}}).select('_id id name subjectId subSkills.id subSkills.name').limit(2001).lean();
  if(skills.length>2000)fail(422,'حدد مواد أقل لتقليل حجم مواصفات الاختبار.');
  const taxonomy=subjects.map(subject=>{
    const options=skills.filter(s=>s.subjectId===subject._id).flatMap(s=>[
      ...[...new Set([s.id,String(s._id)].filter(Boolean))].map(id=>({id:String(id),name:s.name})),
      ...(s.subSkills||[]).map(sub=>({id:sub.id,name:sub.name})),
    ]);
    return {id:String(subject._id),name:subject.name,skillIds:[...new Set(options.map(s=>s.id))],skills:options};
  });
  if(JSON.stringify(taxonomy).length>100000)fail(422,'حجم المهارات كبير؛ اختر مواد أقل.');
  return {pathId:spec.pathId,subjects:taxonomy,select:(item,excluded)=>selectSchoolBankQuestions(spec.pathId,item,excluded)};
}
