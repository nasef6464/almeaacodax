import {z} from 'zod';
import type {PipelineStage} from 'mongoose';
import {UserModel} from '../../../models/User.js';
import {QuizResultModel} from '../../../models/QuizResult.js';
import type {SchoolAssessmentContext} from './schoolAssessmentManagementPolicy.js';
import {schoolAssessmentAudienceStages,schoolAssessmentLatestEvidenceStages,schoolAssessmentStudentIdentity} from '../infrastructure/schoolAssessmentAudienceEvidence.js';
import {buildDocumentQuery} from '../infrastructure/quizDocumentQuery.js';
import {serializeQuizResultForLearner} from '../../../utils/quizResultSerialization.js';
import {requireSchoolDirectorCapability} from '../../schools/application/schoolDirectorAccess.js';

async function assertLearnerEvidenceAccess(context:SchoolAssessmentContext){
 if(context.actor.role!=='school_admin')return;
 const capability=context.actor.schoolId&&await requireSchoolDirectorCapability(context.actor.id,context.actor.schoolId,'SCHOOL_REPORTS_DETAILED_VIEW','SCHOOL_INTELLIGENCE');
 if(!capability)throw Object.assign(new Error('صلاحية التقارير التفصيلية ووحدة التحليلات المدرسية مطلوبة لعرض نتائج الطلاب'),{statusCode:403});
}

export const schoolAssessmentLearnersQuery=z.object({
 page:z.coerce.number().int().min(1).max(100000).default(1),limit:z.coerce.number().int().min(1).max(100).default(50),
 status:z.enum(['all','completed','not_completed','needs_support']).default('all'),search:z.string().trim().max(120).default(''),
}).strict();
export function buildSchoolAssessmentLearnerPipeline(context:SchoolAssessmentContext,query:z.infer<typeof schoolAssessmentLearnersQuery>):PipelineStage[]{
 const pipeline:PipelineStage[]=schoolAssessmentAudienceStages(context.targetPredicate,true);
 if(query.search){const literal=query.search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');pipeline.push({$match:{$or:[{name:{$regex:literal,$options:'i'}},{_id:{$regex:literal,$options:'i'}}]}});}
 const latest=schoolAssessmentLatestEvidenceStages(String(context.quiz.id||context.quiz._id),{id:1,score:1,passed:1,date:1,attemptNumber:1});
 const filters:Record<string,unknown>[]=[];
 if(query.status==='completed')filters.push({evidence:{$exists:true}});
 if(query.status==='not_completed')filters.push({evidence:{$exists:false}});
 if(query.status==='needs_support')filters.push({'evidence.passed':false});
 // Status needs full-population evidence before counting. Ordinary pages count
 // the audience first and join only their bounded rows, not every learner.
 if(query.status!=='all')pipeline.push(...latest);
 if(filters.length)pipeline.push({$match:{$and:filters}});
 pipeline.push({$facet:{count:[{$count:'total'}],learners:[{$sort:{name:1,_id:1}},{$skip:(query.page-1)*query.limit},{$limit:query.limit},
  ...(query.status==='all'?latest as PipelineStage.FacetPipelineStage[]:[]),
  {$project:{_id:0,studentId:'$_id',name:{$ifNull:['$name','$_id']},result:{$cond:[{$ifNull:['$evidence',false]},
   {id:{$toString:{$ifNull:['$evidence.id','$evidence._id']}},score:'$evidence.score',passed:'$evidence.passed',date:'$evidence.date',attemptNumber:'$evidence.attemptNumber'},null]}}},
 ]}});
 return pipeline;
}
export async function readSchoolAssessmentLearners(context:SchoolAssessmentContext,query:z.infer<typeof schoolAssessmentLearnersQuery>){
 await assertLearnerEvidenceAccess(context);
 const pipeline=buildSchoolAssessmentLearnerPipeline(context,query);
 const data=(await UserModel.aggregate(pipeline).allowDiskUse(true))[0];const total=data?.count?.[0]?.total||0;
 return {learners:data?.learners||[],pagination:{page:query.page,limit:query.limit,total,totalPages:Math.ceil(total/query.limit)}};
}
export async function readSchoolAssessmentLearnerResult(context:SchoolAssessmentContext,resultId:string){
 await assertLearnerEvidenceAccess(context);
 const fail=():never=>{throw Object.assign(new Error('School assessment result not found'),{statusCode:404});};
 const fields=['userId','quizId','quizTitle','score','passed','attemptNumber','totalQuestions','correctAnswers','wrongAnswers','unanswered','timeSpentSeconds','timeSpent','date','skillsAnalysis','subjectResults','sectionResults','questionReview'];
 const record=await QuizResultModel.findOne({$and:[buildDocumentQuery(resultId),{quizId:String(context.quiz.id||context.quiz._id),learningContext:'school_assessment'}]}).setOptions({strictQuery:false}).select(fields.join(' ')).lean();
 if(!record)fail();
 const visible=await UserModel.exists({$and:[context.targetPredicate,{$expr:{$eq:[schoolAssessmentStudentIdentity,{$literal:String(record!.userId)}]}}]}).setOptions({strictQuery:false});
 if(!visible)fail();
 // The dedicated school report, its roster and selected review share the same
 // persisted school outcome. Generic compatibility readers/cutover stay untouched.
 // Whitelist frozen evidence and retain the existing learner answer redaction.
 const saved=record! as Record<string,unknown>;
 const result={id:String(record!._id),...Object.fromEntries(fields.filter(key=>key in saved).map(key=>[key,saved[key]]))};
 return {result:serializeQuizResultForLearner(result)};
}
