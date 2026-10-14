import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {QuizModel} from '../../../models/Quiz.js';
import {QuizResultModel} from '../../../models/QuizResult.js';
import {LiveExamSessionModel} from '../../../models/LiveExamSession.js';
import {AssessmentVersionModel} from '../infrastructure/assessmentVersionModel.js';
import {assertSchoolAssessmentOperation,type SchoolAssessmentContext} from './schoolAssessmentManagementPolicy.js';

const contentKeys=['pathId','subjectId','sectionId','type','quizKind','questionIds','mockExam','skillIds'];
const scoringSettings=(settings:Record<string,unknown>={})=>Object.fromEntries(Object.entries(settings).filter(([key])=>!['maxAttempts','showAnswers','showExplanations'].includes(key)));
export const schoolAssessmentContentChanged=(quiz:any,patch:any)=>
  contentKeys.some(key=>Object.hasOwn(patch,key)&&!isDeepStrictEqual(quiz[key],patch[key]))
  || (Object.hasOwn(patch,'settings')&&!isDeepStrictEqual(scoringSettings(quiz.settings),scoringSettings(patch.settings)))
  || Boolean(patch.questions?.length);

export async function schoolAssessmentContentLocked(quiz:any){
  if(quiz.isPublished)return true;
  const quizIds=[...new Set([quiz.id,quiz._id].filter(Boolean).map(String))];
  const evidence=await Promise.all([
    QuizResultModel.exists({quizId:{$in:quizIds}}),
    LiveExamSessionModel.exists({quizId:{$in:quizIds}}),
    AssessmentVersionModel.exists({assessmentId:{$in:quizIds}}),
  ]);
  return evidence.some(Boolean);
}
export async function assertSchoolAssessmentDefinitionEditable(quiz:any,patch:any){
  const schoolDirected=quiz.mode==='central'||quiz.targetGroupIds?.length||quiz.targetUserIds?.length;
  if(!schoolDirected||!schoolAssessmentContentChanged(quiz,patch))return false;
  if(await schoolAssessmentContentLocked(quiz))throw Object.assign(new Error('لا يمكن تغيير محتوى اختبار نُشر أو بدأه الطلاب؛ أنشئ نسخة للتعديل.'),{statusCode:409});
  return true;
}

export function prepareSchoolDraftPublication(existing:any,payload:any,actor:any,sanitized:Record<string,unknown>){
  if(existing.ownerType!=='school'||existing.mode!=='central')return sanitized;
  const next={...existing,...sanitized};
  if(next.isPublished===true&&!next.targetGroupIds?.length&&!next.targetUserIds?.length)
    throw Object.assign(new Error('اختر الطلاب أو الفصول المستهدفة قبل نشر الاختبار المدرسي.'),{statusCode:400});
  // A supervisor's own private draft uses the same school publication authority
  // as new school assessments. Teacher pending-review/rejected work is unchanged.
  if(payload.isPublished===true&&sanitized.isPublished===true&&['admin','supervisor','school_admin'].includes(actor.role)&&
    existing.approvalStatus==='draft'&&(payload.approvalStatus===undefined||payload.approvalStatus==='approved'))
    return {...sanitized,approvalStatus:'approved',approvedBy:actor.id,approvedAt:Date.now()};
  return sanitized;
}

export async function cloneSchoolAssessment(context:SchoolAssessmentContext){
  await assertSchoolAssessmentOperation(context,'clone');
  const source=context.quiz;
  const definition=Object.fromEntries(['description','pathId','subjectId','sectionId','type','quizKind','questionIds','mockExam','skillIds','settings'].map(key=>[key,(source as any)[key]]));
  const id='school_quiz_'+randomUUID();
  const created=await QuizModel.create({...definition,_id:id,id,title:source.title+' — نسخة',mode:'central',
    targetGroupIds:[],targetUserIds:[],learningPlacements:[],isPublished:false,showOnPlatform:false,
    ownerType:'school',ownerId:context.actor.id,createdBy:context.actor.id,approvalStatus:'draft',
    access:{type:'free'},opensAt:null,closesAt:null,dueDate:null});
  return created.toObject();
}

// Every school write participates, including publication and metadata. Otherwise
// stale unchanged scoring fields can overwrite a newer published definition.
export function schoolAssessmentWrite(quiz:any,patch:any,query:any,contentEdit=false){
  const directed=quiz.mode==='central'||quiz.targetGroupIds?.length||quiz.targetUserIds?.length
    ||patch.mode==='central'||patch.targetGroupIds?.length||patch.targetUserIds?.length;
  if(!directed)return {query,update:patch};
  const version=quiz.__v===undefined?{$exists:false}:quiz.__v;
  return {
    query:{$and:[query,{__v:version},...(contentEdit?[{isPublished:{$ne:true}}]:[])]},
    update:{$set:patch,$inc:{__v:1}},
  };
}
