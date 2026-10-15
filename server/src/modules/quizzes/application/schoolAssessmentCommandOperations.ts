import type {ClientSession} from 'mongoose';
import {createHash} from 'node:crypto';
import {UserModel} from '../../../models/User.js';
import {QuizResultModel} from '../../../models/QuizResult.js';
import {NotificationDeliveryModel} from '../../../models/NotificationDelivery.js';
import {getNotificationBatchLimit} from '../../../services/notificationService.js';
import {QuizRetakeModel,quizRetakeId} from '../infrastructure/quizRetakeModel.js';
import {buildDocumentsByIdsQuery} from '../infrastructure/quizDocumentQuery.js';
import {getQuizMaxAttempts} from './quizAttemptContext.js';
import {getQuizAvailability,validateQuizWindow} from './quizAvailability.js';
import {assertSchoolAssessmentAudience,type SchoolAssessmentContext} from './schoolAssessmentManagementPolicy.js';
import type {SchoolAssessmentCommand,SchoolAssessmentCommandResult} from './schoolAssessmentCommandSchema.js';
import type {NotificationRealtimeEvent} from '../../notifications/infrastructure/notificationRealtime.js';
const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};
const userKey={$convert:{input:{$cond:[{$in:[{$ifNull:['$id',null]},[null,'',0,false]]},'$_id','$id']},to:'string',onError:'',onNull:''}};

async function assignedStudents(context:SchoolAssessmentContext,studentIds:string[],session:ClientSession){
  const students=await UserModel.find({$and:[context.targetPredicate,{isActive:{$ne:false}},buildDocumentsByIdsQuery(studentIds)]})
    .setOptions({strictQuery:false}).select('id _id').session(session).lean();
  const found=new Set(students.flatMap((student:any)=>[student.id,String(student._id)].filter(Boolean)));
  if(studentIds.some(id=>!found.has(id)))fail(403,'اختر طلابًا نشطين من المستهدفين الحاليين فقط.');
  return students.map((student:any)=>String(student.id||student._id));
}

export async function prepareSchoolCommandEffects(context:SchoolAssessmentContext,quiz:any,command:SchoolAssessmentCommand,receiptId:string,session:ClientSession){
  const quizId=String(quiz.id||quiz._id);
  const result:SchoolAssessmentCommandResult={commandId:command.commandId,operation:command.operation};
  const patch:Record<string,unknown>={};
  const events:NotificationRealtimeEvent[]=[];
  if(command.operation==='retarget'){
    await assertSchoolAssessmentAudience(context,{...quiz,...command.payload});
    Object.assign(patch,command.payload);
    Object.assign(result,{targetGroupCount:command.payload.targetGroupIds.length,targetUserCount:command.payload.targetUserIds.length});
    return {result,patch,events};
  }
  if(quiz.isPublished!==true)fail(400,'انشر الاختبار قبل إرسال تذكير أو فتح إتاحة جديدة.');
  if(command.operation==='reopen'||command.operation==='retake'){
    validateQuizWindow(command.payload);
    if(Date.parse(command.payload.closesAt)<=Date.now())fail(400,'اختر نهاية مستقبلية بعد البداية.');
  }
  if(command.operation==='reopen'){
    Object.assign(patch,{...command.payload,dueDate:command.payload.closesAt});
    result.reopened=true;
  }else if(command.operation==='retake'){
    const studentIds=await assignedStudents(context,command.payload.studentIds,session);
    const counts=await QuizResultModel.aggregate<{_id:string;count:number}>([
      {$match:{quizId,userId:{$in:studentIds}}},{$group:{_id:'$userId',count:{$sum:1}}},
    ]).session(session);
    const used=new Map(counts.map(row=>[row._id,row.count]));
    await QuizRetakeModel.bulkWrite(studentIds.map(studentId=>({updateOne:{
      filter:{_id:quizRetakeId(quizId,studentId)},
      update:{$set:{quizId,studentId,opensAt:command.payload.opensAt,closesAt:command.payload.closesAt,grantedBy:context.actor.id},
        $max:{maxAttempts:Math.max(getQuizMaxAttempts(quiz),(used.get(studentId)||0)+1)}},upsert:true,
    }})),{session});
    result.grantedCount=studentIds.length;
  }else{
    if(getQuizAvailability(quiz)==='closed')fail(409,'أعد فتح موعد الاختبار قبل تذكير الطلاب.');
    const selected=command.payload.studentIds;
    if(selected)await assignedStudents(context,selected,session);
    const limit=getNotificationBatchLimit();
    const students=await UserModel.aggregate<{_id:string}>([
      {$match:{$and:[context.targetPredicate,{isActive:{$ne:false}},...(selected?[buildDocumentsByIdsQuery(selected)]:[])]}},
      {$set:{__key:userKey}},{$group:{_id:'$__key'}},
      {$lookup:{from:QuizResultModel.collection.name,let:{student:'$_id'},pipeline:[
        {$match:{quizId,learningContext:'school_assessment',$expr:{$eq:['$userId','$$student']}}},{$limit:1},{$project:{_id:1}},
      ],as:'__completed'}},
      {$match:{'__completed.0':{$exists:false}}},{$limit:limit+1},{$project:{_id:1}},
    ]).session(session);
    if(students.length>limit)fail(422,`اختر حتى ${limit} طالبًا في الإرسال الواحد؛ لم تُرسل أي تنبيهات.`);
    const now=Date.now(),title='تذكير بأداء الاختبار',body=`نذكرك بأداء الاختبار: ${quiz.title}`;
    const deliveries=students.map(student=>({
      id:createHash('sha256').update(JSON.stringify([receiptId,student._id,'in_app'])).digest('hex'),
      campaignId:receiptId,channel:'in_app',status:'sent',title,subject:title,body,
      recipientUserId:student._id,recipientRole:'student',provider:'internal',sentAt:now,createdBy:context.actor.id,
      metadata:{quizId,commandId:command.commandId},
    }));
    if(deliveries.length){
      await NotificationDeliveryModel.insertMany(deliveries,{session});
      events.push(...deliveries.map(item=>({recipientUserId:item.recipientUserId,id:item.id,title:item.title,body:item.body,createdAt:new Date(now).toISOString(),readAt:null as null})));
    }
    result.notifiedCount=deliveries.length;
  }
  return {result,patch,events};
}
