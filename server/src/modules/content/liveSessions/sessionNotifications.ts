import type { ClientSession } from 'mongoose';
import { NotificationDeliveryModel } from '../../../models/NotificationDelivery.js';
export async function writeSessionNotifications(item:any, actorId:string, event:string, transaction:ClientSession) {
  const users=Array.from(new Set([item.teacherId,item.audience.kind==='private'?item.audience.studentId:''].filter(Boolean))) as string[];
  const date=new Date();
  const docs=users.filter(id=>id!==actorId).map(id=>({id:`live:${item._id}:${event}:${item.changes.length}:${id}`,channel:'in_app',status:'sent',title:'تحديث موعد الحصة',body:`${item.title} — ${event==='confirmed'?'تم تأكيد الموعد':event==='cancel'?'تم إلغاء الحصة':event==='complete'?'انتهت الحصة':'تم تغيير الموعد'}`,recipientUserId:id,createdBy:actorId,provider:'internal',sentAt:date,metadata:{sessionId:String(item._id),link:'/live-sessions'}}));
  if(docs.length)await NotificationDeliveryModel.insertMany(docs,{session:transaction});
}
