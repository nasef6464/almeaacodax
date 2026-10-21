import type { PipelineStage } from 'mongoose';
import { UserModel } from '../../../models/User.js';
import {QuizResultModel} from '../../../models/QuizResult.js';
import {schoolAssessmentAudienceStages,schoolAssessmentResultEvidenceStages} from './schoolAssessmentAudienceEvidence.js';

export async function readSchoolAssessmentReport(targetPredicate: Record<string,unknown>, quizId: string) {
  const dimension = (field:string, id:string, label:string, questions:string, correct:string,counts=false): PipelineStage.FacetPipelineStage[] => [
    {$unwind:`$evidence.${field}`},
    {$match:{[`evidence.${field}.${id}`]:{$nin:['',null]}}},
    {$group:{_id:{id:field==='skillsAnalysis'?{$concat:[{$ifNull:['$evidence.skillsAnalysis.subjectId','']},'|',{$ifNull:['$evidence.skillsAnalysis.level','']},'|',`$evidence.${field}.${id}`]}:field==='sectionResults'?{$cond:[{$ne:[{$ifNull:['$evidence.sectionResults.subjectId','']},'']},{$concat:['$evidence.sectionResults.subjectId','|','$evidence.sectionResults.sectionId']},'$evidence.sectionResults.sectionId']}:`$evidence.${field}.${id}`,learner:'$_id'},label:{$first:`$evidence.${field}.${label}`},subjectId:{$first:{$ifNull:[`$evidence.${field}.subjectId`,'']}},
      questions:{$sum:{$ifNull:[`$evidence.${field}.${questions}`,0]}},correct:{$sum:{$ifNull:[`$evidence.${field}.${correct}`,0]}},
      ...(counts?{wrong:{$sum:{$ifNull:[`$evidence.${field}.wrong`,0]}},unanswered:{$sum:{$ifNull:[`$evidence.${field}.unanswered`,0]}}}:{})}},
    {$group:{_id:'$_id.id',label:{$first:'$label'},subjectId:{$first:'$subjectId'},learners:{$sum:1},questions:{$sum:'$questions'},correct:{$sum:'$correct'},...(counts?{wrong:{$sum:'$wrong'},unanswered:{$sum:'$unanswered'}}:{})}},
    {$project:{_id:0,id:'$_id',label:{$ifNull:['$label','$_id']},subjectId:1,learners:1,questions:1,correct:1,...(counts?{wrong:1,unanswered:1}:{}),
      average:{$cond:[{$gt:['$questions',0]},{$round:[{$multiply:[{$divide:['$correct','$questions']},100]},2]},null]}}},
    {$sort:{id:1}},
  ];
  const audience=await UserModel.aggregate(schoolAssessmentAudienceStages(targetPredicate)).allowDiskUse(true);
  const pipeline:PipelineStage[] = [
    ...schoolAssessmentResultEvidenceStages(quizId,audience.map(row=>String(row._id)),{score:1,passed:1,totalQuestions:1,skillsAnalysis:1,sectionResults:1,subjectResults:1,'quizSnapshot.subjectId':1}),
    {$facet:{
      totals:[{$group:{_id:null,targeted:{$sum:1},completed:{$sum:{$cond:[{$ifNull:['$evidence',false]},1,0]}},
        average:{$avg:'$evidence.score'},highest:{$max:'$evidence.score'},lowest:{$min:'$evidence.score'},passed:{$sum:{$cond:['$evidence.passed',1,0]}}}}],
      skills:dimension('skillsAnalysis','skillId','skill','questionCount','correctCount'),
      sections:dimension('sectionResults','sectionId','sectionName','total','correct',true),
      subjects:dimension('subjectResults','subjectId','subjectName','total','correct',true),
      subjectCoverage:[{$match:{evidence:{$exists:true}}},{$group:{_id:null,completed:{$sum:1},withEvidence:{$sum:{$cond:[{$and:[
        {$isArray:'$evidence.subjectResults'},{$gt:['$evidence.totalQuestions',0]},{$eq:[{$sum:'$evidence.subjectResults.total'},'$evidence.totalQuestions']},
      ]},1,0]}}}}],
      // Subject results use question/section evidence, not an average of overlapping skill links.
      legacySubjects:[{$match:{'evidence.quizSnapshot.subjectId':{$nin:['',null]},'evidence.sectionResults.0':{$exists:false}}},
        {$group:{_id:'$evidence.quizSnapshot.subjectId',learners:{$sum:1},average:{$avg:'$evidence.score'}}},
        {$project:{_id:0,id:'$_id',label:'$_id',learners:1,questions:{$literal:null},correct:{$literal:null},average:{$round:['$average',2]}}}],
    }},
  ];
  const data=(await QuizResultModel.aggregate(pipeline).allowDiskUse(true))[0];
  const totals=data.totals[0]||{completed:0,average:null,highest:null,lowest:null,passed:0};
  data.totals=[{...totals,targeted:audience.length}];
  return data;
}
