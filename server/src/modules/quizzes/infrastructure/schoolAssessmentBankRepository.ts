import {QuestionModel} from '../../../models/Question.js';
import type {SchoolCompositionSpec} from '../application/schoolAssessmentComposition.js';

export async function selectSchoolBankQuestions(pathId:string,spec:SchoolCompositionSpec['subjectSpecs'][number],excluded:string[]){
  const subject={$or:[{subjectId:spec.subjectId},{subjectId:{$in:[null,'']},subject:spec.subjectId}]};
  const skills=spec.skillIds.length?{$or:['skillIds','skillId','subSkillIds','subSkillId'].map(key=>({[key]:{$in:spec.skillIds}}))}:{};
  // Match the shared content-usability contract before counting or sampling.
  const usable={$and:[{$or:[{text:/\S/},{imageUrl:/\S/}]},{$expr:{$or:[
    {$not:[{$in:[{$ifNull:['$type','mcq']},['mcq','true_false']]}]},
    {$gte:[{$cond:[{$isArray:'$options'},{$size:'$options'},0]},2]},
  ]}}]};
  const nativeId={$cond:[{$gt:[{$strLenCP:{$ifNull:['$id','']}},0]},'$id',{$toString:'$_id'}]};
  const [result]=await QuestionModel.aggregate([
    {$match:{pathId,approvalStatus:'approved',...(spec.difficulty?{difficulty:spec.difficulty}:{}),$and:[subject,skills,usable]}},
    {$set:{__id:nativeId}},
    {$set:{__baseId:{$arrayElemAt:[{$getField:{field:'captures',input:{$regexFind:{input:'$__id',regex:'^(.*?)(?:_copy(?:_\\d+)?)?$',options:'i'}}}},0]},
      __code:{$toUpper:{$trim:{input:{$ifNull:['$questionCode','']}}}}}},
    {$sort:{id:1,_id:1}},
    {$group:{_id:'$__baseId',id:{$first:'$__id'},code:{$max:'$__code'},codes:{$addToSet:'$__code'}}},
    {$set:{__key:{$concat:['id:','$_id']},__canonical:{$cond:[{$gt:[{$strLenCP:'$code'},0]},{$concat:['code:','$code']},{$concat:['id:','$_id']}]}}},
    {$set:{aliases:{$concatArrays:[['$__key'],{$map:{input:{$filter:{input:'$codes',as:'code',cond:{$ne:['$$code','']}}},as:'code',in:{$concat:['code:','$$code']}}}]}}},
    {$match:{$expr:{$eq:[{$size:{$setIntersection:['$aliases',excluded]}},0]}}},
    {$group:{_id:'$__canonical',id:{$first:'$id'},key:{$first:'$__key'},aliasGroups:{$push:'$aliases'}}},
    {$set:{aliases:{$reduce:{input:'$aliasGroups',initialValue:[],in:{$setUnion:['$$value','$$this']}}}}},
    {$facet:{total:[{$count:'count'}],questions:[{$sample:{size:spec.count}},{$project:{_id:0,id:1,key:1,aliases:1}}]}},
  ]);
  return {available:result?.total?.[0]?.count||0,questions:result?.questions||[]};
}
