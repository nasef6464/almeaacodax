import type { PipelineStage } from 'mongoose';
import { UserModel } from '../../../models/User.js';
import { QuizResultModel } from '../../../models/QuizResult.js';

export async function readSchoolAssessmentReport(targetPredicate: Record<string,unknown>, quizId: string) {
  const dimension = (field:string, id:string, label:string, questions:string, correct:string): PipelineStage.FacetPipelineStage[] => [
    {$unwind:`$evidence.${field}`},
    {$match:{[`evidence.${field}.${id}`]:{$nin:['',null]}}},
    {$group:{_id:{id:field==='skillsAnalysis'?{$concat:[{$ifNull:['$evidence.skillsAnalysis.subjectId','']},'|',{$ifNull:['$evidence.skillsAnalysis.level','']},'|',`$evidence.${field}.${id}`]}:`$evidence.${field}.${id}`,learner:'$_id'},label:{$first:`$evidence.${field}.${label}`},
      questions:{$sum:{$ifNull:[`$evidence.${field}.${questions}`,0]}},correct:{$sum:{$ifNull:[`$evidence.${field}.${correct}`,0]}}}},
    {$group:{_id:'$_id.id',label:{$first:'$label'},learners:{$sum:1},questions:{$sum:'$questions'},correct:{$sum:'$correct'}}},
    {$project:{_id:0,id:'$_id',label:{$ifNull:['$label','$_id']},learners:1,questions:1,correct:1,
      average:{$cond:[{$gt:['$questions',0]},{$round:[{$multiply:[{$divide:['$correct','$questions']},100]},2]},null]}}},
    {$sort:{id:1}},
  ];
  const pipeline:PipelineStage[] = [
    {$match:targetPredicate},
    {$project:{studentId:{$toString:{$cond:[{$in:[{$ifNull:['$id',null]},[null,'',0,false]]},'$_id','$id']}}}},
    {$group:{_id:'$studentId'}},
    {$lookup:{from:QuizResultModel.collection.name,localField:'_id',foreignField:'userId',as:'evidence',pipeline:[
      {$match:{quizId,learningContext:'school_assessment'}},
      {$set:{reportDate:{$convert:{input:'$date',to:'date',onError:'$createdAt',onNull:'$createdAt'}}}},
      {$sort:{reportDate:-1,createdAt:-1,_id:-1}},{$limit:1},
      // Never carry question bodies, answers or learner names into a summary.
      {$project:{score:1,passed:1,skillsAnalysis:1,sectionResults:1,'quizSnapshot.subjectId':1}},
    ]}},
    {$unwind:{path:'$evidence',preserveNullAndEmptyArrays:true}},
    {$facet:{
      totals:[{$group:{_id:null,targeted:{$sum:1},completed:{$sum:{$cond:[{$ifNull:['$evidence',false]},1,0]}},
        average:{$avg:'$evidence.score'},highest:{$max:'$evidence.score'},lowest:{$min:'$evidence.score'},passed:{$sum:{$cond:['$evidence.passed',1,0]}}}}],
      skills:dimension('skillsAnalysis','skillId','skill','questionCount','correctCount'),
      sections:dimension('sectionResults','sectionId','sectionName','total','correct'),
      // Subject results use question/section evidence, not an average of overlapping skill links.
      subjects:[{$match:{'evidence.quizSnapshot.subjectId':{$nin:['',null]},'evidence.sectionResults.0':{$exists:false}}},
        {$group:{_id:'$evidence.quizSnapshot.subjectId',learners:{$sum:1},average:{$avg:'$evidence.score'}}},
        {$project:{_id:0,id:'$_id',label:'$_id',learners:1,questions:{$literal:null},correct:{$literal:null},average:{$round:['$average',2]}}}],
    }},
  ];
  return (await UserModel.aggregate(pipeline).allowDiskUse(true))[0];
}
