import mongoose from 'mongoose';
import {QuizModel} from '../../../models/Quiz.js';
import {NotificationDeliveryModel} from '../../../models/NotificationDelivery.js';
import {QuizRetakeModel} from '../infrastructure/quizRetakeModel.js';
import {SchoolAssessmentCommandModel} from '../infrastructure/schoolAssessmentCommandModel.js';
import {publishInAppNotificationEvents} from '../../notifications/infrastructure/notificationRealtime.js';
import {resolveSchoolAssessmentContext,assertSchoolAssessmentOperation} from './schoolAssessmentManagementPolicy.js';
import {normalizeSchoolAssessmentCommand,schoolCommandIdentity,type SchoolAssessmentCommandResult} from './schoolAssessmentCommandSchema.js';
import {prepareSchoolCommandEffects} from './schoolAssessmentCommandOperations.js';

export async function executeSchoolAssessmentCommand(principal:{id?:unknown;_id?:unknown},quizId:string,raw:unknown,options:{publish?:typeof publishInAppNotificationEvents}={}){
  const command=normalizeSchoolAssessmentCommand(raw);
  const context=await resolveSchoolAssessmentContext(principal,quizId);
  await assertSchoolAssessmentOperation(context,command.operation);
  const canonicalId=String(context.quiz.id||context.quiz._id),actorId=context.actor.id;
  const identity=schoolCommandIdentity(actorId,canonicalId,command);
  const readReceipt=(receipt:any):SchoolAssessmentCommandResult=>{
    if(receipt.actorId!==actorId||receipt.quizId!==canonicalId||receipt.commandId!==command.commandId||receipt.requestHash!==identity.hash)
      throw Object.assign(new Error('معرف الطلب مستخدم بتفاصيل مختلفة؛ أعد فتح العملية.'),{statusCode:409});
    return receipt.result;
  };
  const completed=await SchoolAssessmentCommandModel.findById(identity.id).lean();
  if(completed)return readReceipt(completed);
  await Promise.all([SchoolAssessmentCommandModel.init(),NotificationDeliveryModel.init(),QuizRetakeModel.init()]);
  const session=await mongoose.startSession();
  try{
    let committed;
    try{
      committed=await session.withTransaction(async()=>{
        const receipt=await SchoolAssessmentCommandModel.findById(identity.id).session(session).lean();
        if(receipt)return {result:readReceipt(receipt),events:[]};
        const quiz=await QuizModel.findById(context.quiz._id).session(session).lean();
        if(!quiz||quiz.__v!==context.quiz.__v)
          throw Object.assign(new Error('تغير الاختبار؛ أعد تحميله ثم حاول مرة أخرى.'),{statusCode:409});
        // Shared version fencing serializes audience/window/attempt operations
        // with first publication and edits, without modifying frozen content.
        const effects=await prepareSchoolCommandEffects(context,quiz,command,identity.id,session);
        const version=quiz.__v===undefined?{$exists:false}:quiz.__v;
        const write=await QuizModel.updateOne({_id:quiz._id,__v:version},{$inc:{__v:1},...(Object.keys(effects.patch).length?{$set:effects.patch}:{})},{session});
        if(write.modifiedCount!==1)throw Object.assign(new Error('تغير الاختبار؛ أعد المحاولة.'),{statusCode:409});
        await SchoolAssessmentCommandModel.create([{_id:identity.id,actorId,quizId:canonicalId,commandId:command.commandId,requestHash:identity.hash,operation:command.operation,result:effects.result}],{session});
        return {result:effects.result,events:effects.events};
      },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
    }catch(error:any){
      if(error?.code!==11000)throw error;
      // A duplicate is success only after verifying the committed receipt.
      const receipt=await SchoolAssessmentCommandModel.findById(identity.id).lean();
      if(!receipt)throw error;
      return readReceipt(receipt);
    }
    if(!committed)throw new Error('School command transaction did not commit');
    if(committed.events.length){
      // Inbox rows are durable. A transient realtime outage must not replay
      // the database effects or turn a committed command into another grant.
      try{await (options.publish||publishInAppNotificationEvents)(committed.events);}
      catch{console.warn('[school-assessment-command] realtime delivery deferred to inbox',{quizId:canonicalId,commandId:command.commandId});}
    }
    return committed.result;
  }finally{await session.endSession();}
}
