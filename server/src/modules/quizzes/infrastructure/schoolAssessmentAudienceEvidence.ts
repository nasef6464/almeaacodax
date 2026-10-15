import type {PipelineStage} from 'mongoose';
import {QuizResultModel} from '../../../models/QuizResult.js';

export const schoolAssessmentStudentIdentity={$toString:{$cond:[{$in:[{$ifNull:['$id',null]},[null,'',0,false]]},'$_id','$id']}};
/** Shared by full summary and paged roster: identical audience and latest school attempt. */
export function schoolAssessmentAudienceStages(targetPredicate:Record<string,unknown>,includeName=false):PipelineStage[]{
 return [
  {$match:targetPredicate},
  {$project:{studentId:schoolAssessmentStudentIdentity,...(includeName?{name:1}:{})}},
  {$group:{_id:'$studentId',...(includeName?{name:{$first:'$name'}}:{})}},
 ];
}
export function schoolAssessmentLatestEvidenceStages(quizId:string,projection:Record<string,1>):PipelineStage[]{
 return [
  {$lookup:{from:QuizResultModel.collection.name,localField:'_id',foreignField:'userId',as:'evidence',pipeline:[
   {$match:{quizId,learningContext:'school_assessment'}},
   {$set:{reportDate:{$convert:{input:'$date',to:'date',onError:'$createdAt',onNull:'$createdAt'}}}},
   {$sort:{reportDate:-1,createdAt:-1,_id:-1}},{$limit:1},{$project:projection},
  ]}},
  {$unwind:{path:'$evidence',preserveNullAndEmptyArrays:true}},
 ];
}
export function schoolAssessmentAudienceEvidence(targetPredicate:Record<string,unknown>,quizId:string,projection:Record<string,1>,includeName=false):PipelineStage[]{
 return [...schoolAssessmentAudienceStages(targetPredicate,includeName),...schoolAssessmentLatestEvidenceStages(quizId,projection)];
}
