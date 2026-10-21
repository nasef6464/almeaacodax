import {z} from 'zod';
import {UserModel} from '../../../models/User.js';
import {readLearningEvidencePopulation} from '../infrastructure/learningEvidencePopulation.js';
import {resolveSchoolDirectoryScope,directoryObjectIds} from '../../schools/application/schoolDirectoryScope.js';
import {requireSchoolDirectorCapability} from '../../schools/application/schoolDirectorAccess.js';
import {resolveTeacherAssessmentClassIds} from './teacherAssessmentClassScope.js';
import {buildDocumentQuery} from '../infrastructure/quizDocumentQuery.js';
import {LEARNING_EVIDENCE_POLICY} from './learningEvidencePolicy.js';
export const learningEvidenceQuery=z.object({source:z.enum(['platform_self_study','school_assessment']),subjectId:z.string().trim().min(1).max(128),search:z.string().trim().max(80).optional(),pathId:z.string().trim().min(1).max(128).optional(),schoolId:z.string().trim().min(1).max(128).optional(),classId:z.string().trim().min(1).max(128).optional(),quizId:z.string().trim().min(1).max(128).optional(),days:z.coerce.number().int().min(1).max(180).default(90),page:z.coerce.number().int().min(1).max(100000).default(1),limit:z.coerce.number().int().min(1).max(30).default(12),status:z.enum(['unmeasured','insufficient','support','developing','ready']).optional()}).strict();
const fail=(message:string):never=>{throw Object.assign(new Error(message),{statusCode:403});};
export async function readLearningEvidence(principal:{id?:unknown;_id?:unknown},input:unknown){
 const query=learningEvidenceQuery.parse(input);
 const stored=await UserModel.findOne(buildDocumentQuery(String(principal.id||principal._id||''))).setOptions({strictQuery:false}).lean();
 if(!stored||stored.isActive===false)fail('Active staff required');
 const actor={...stored!,id:String((stored as any).id||stored!._id)};
 if(!['admin','school_admin','supervisor','teacher'].includes(actor.role))fail('School staff required');
 const directory=await resolveSchoolDirectoryScope(actor);
 let schoolIds=directory.schoolIds,groups=directory.groups;
 if(actor.role==='school_admin'){
  if(!query.schoolId)fail('Choose an authorized school');
  const permitted=await requireSchoolDirectorCapability(actor.id,query.schoolId!,'SCHOOL_REPORTS_DETAILED_VIEW','SCHOOL_INTELLIGENCE');
  if(!permitted)fail('Detailed school report permission and module required');
  const {GroupModel}=await import('../../../models/Group.js');
  groups=await GroupModel.find({parentId:query.schoolId,type:{$in:['CLASS','PRIVATE_GROUP']}}).lean();schoolIds=[query.schoolId!];
 }
 if(actor.role==='teacher'){
  const classes=await resolveTeacherAssessmentClassIds(actor,{subjectId:query.subjectId},directory);
  groups=groups.filter(g=>classes.includes(String(g._id)));schoolIds=[];
 }
 const allowedSchools=[...new Set([...schoolIds,...groups.map(g=>String(g.type==='SCHOOL'?g._id:g.parentId||'')).filter(Boolean)])];
 if(query.schoolId&&actor.role!=='admin'&&!allowedSchools.includes(query.schoolId))fail('School outside staff authority');
 if(query.schoolId){schoolIds=schoolIds.filter(id=>id===query.schoolId);groups=groups.filter(g=>String(g._id)===query.schoolId||String(g.parentId)===query.schoolId);}
 if(query.classId){if(!groups.some(g=>String(g._id)===query.classId&&['CLASS','PRIVATE_GROUP'].includes(g.type)))fail('Class outside subject authority');groups=groups.filter(g=>String(g._id)===query.classId);schoolIds=[];}
 const groupIds=groups.map(g=>String(g._id));const rosterIds=directoryObjectIds(groups.flatMap(g=>g.studentIds||[]));
 const authority:any=actor.role==='admin'?{role:'student',...(query.schoolId?{schoolId:query.schoolId}:{})}:{role:'student',$or:[{groupIds:{$in:groupIds}},{_id:{$in:rosterIds}},{schoolId:{$in:schoolIds}}]};
 if(query.search){const slash=String.fromCharCode(92);authority.name={$regex:Array.from(query.search).map(char=>(slash+'^$.*+?()[]{}|').includes(char)?slash+char:char).join(''),$options:'i'};}
 const cutoff=new Date(Date.now()-query.days*86400000);
 const sourceScope:any={learningContext:query.source,...(query.quizId?{quizId:query.quizId}:{}),...(query.source==='school_assessment'&&(actor.role!=='admin'||query.schoolId)?{schoolId:{$in:query.schoolId?[query.schoolId]:allowedSchools}}:{})};
 const skillFilter:any={'skillsAnalysis.subjectId':query.subjectId,'skillsAnalysis.skillId':{$nin:['',null]},...(query.pathId?{'skillsAnalysis.pathId':query.pathId}:{})};
 const data=await readLearningEvidencePopulation(authority,sourceScope,skillFilter,cutoff,query);
 const summary=data.summary;
 const students=data.students;
 return {source:query.source,subjectId:query.subjectId,days:query.days,policy:LEARNING_EVIDENCE_POLICY,coverage:'complete' as const,total:Object.values(summary).reduce((a,b)=>a+b,0),filteredTotal:data.filteredTotal,page:query.page,limit:query.limit,summary,students};
}
