import mongoose from 'mongoose';
import { z } from 'zod';
import { ActivityModel } from '../../../models/Activity.js';
import { LessonModel } from '../../../models/Lesson.js';
import { UserModel } from '../../../models/User.js';
import { LiveSessionModel } from '../../../models/LiveSession.js';
import { LiveReservationModel } from '../../../models/LiveReservation.js';
import { validateMeetingLink } from './meetingLinkPolicy.js';
import { parseScheduledTime, inJoinWindow } from './sessionTime.js';
import { reserveSession, withSessionTransaction, fail } from './scheduling.js';
import { serializeBooking } from './bookingRequests.js';
import type { SessionActor, SessionView } from './contracts.js';
import { writeSessionNotifications } from './sessionNotifications.js';

export const sessionInputSchema = z.object({
  provider: z.enum(['zoom','google_meet','teams','live_youtube']).default('zoom'),
  hostingMode: z.enum(['teacher_account','platform_account','manual_link']).default('manual_link'),
  hostId: z.string().max(100).default(''), teacherId: z.string().min(1).max(100),
  meetingUrl: z.string().max(2000).default(''), meetingDate: z.string().max(50).default(''),
  duration: z.coerce.number().int().min(15).max(480).default(60),
  pathId: z.string().max(100).optional(), subjectId: z.string().max(100).optional(),
});
export const sessionView = (item: any, early = 15, late = 30): SessionView => ({
  id: String(item._id), title: item.title, source: item.source, audience: { kind: item.audience.kind },
  provider: item.provider, hostingMode: item.hostingMode, teacherId: item.teacherId, teacherName: item.teacherName,
  startAt: new Date(item.startAt).toISOString(), endAt: new Date(item.endAt).toISOString(), timeZone: item.timeZone,
  state: item.state, meetingReadiness: item.meetingReadiness,
  hasRecording: item.state === 'completed' && Boolean(item.showRecording && item.recordingUrl), pathId: item.pathId, levelId: item.levelId, subjectId: item.subjectId,
  canJoin: Boolean(item.meetingUrl) && inJoinWindow(item, new Date(), early, late), hostCapacityVerified: item.hostCapacityVerified,
});

export async function validateSessionInput(actor: SessionActor, input: unknown, fallbackDate = '', fallbackTime = '') {
  const data = sessionInputSchema.parse(input);
  if (actor.role !== 'admin' && (actor.role !== 'teacher' || data.teacherId !== actor.id)) fail('غير مصرح بتخصيص المدرس',403);
  if (!mongoose.isValidObjectId(data.teacherId)) fail('اختر مدرسًا مسجلًا');
  const teacher = await UserModel.findOne({ _id: data.teacherId, role: { $in: ['teacher','admin'] }, isActive: { $ne: false } }).select('name').lean();
  if (!teacher) fail('المدرس غير متاح');
  let startAt: Date;
  if (data.meetingDate) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(data.meetingDate)) fail('الموعد يحتاج توقيتًا صريحًا');
    startAt = new Date(data.meetingDate);
    if (!Number.isFinite(+startAt) || startAt.toISOString().slice(0,10) !== data.meetingDate.slice(0,10)) fail('الموعد غير صحيح');
  } else { startAt = new Date(parseScheduledTime(fallbackDate, fallbackTime)); }
  if (+startAt < Date.now() - 60000) fail('اختر موعدًا قادمًا');
  const meetingUrl = data.meetingUrl ? validateMeetingLink(data.provider,data.meetingUrl) : '';
  if (data.hostingMode !== 'manual_link' && !data.hostId) fail('اختر حساب الاستضافة أو استخدم رابطًا يدويًا');
  if (data.hostingMode === 'manual_link' && data.hostId) fail('الرابط اليدوي لا يستخدم حساب استضافة مربوطًا');
  return { ...data, duration: String(data.duration), teacherName: teacher!.name, startAt, endAt: new Date(+startAt + data.duration * 60000), meetingUrl, meetingReadiness: meetingUrl ? 'manual_ready' : 'awaiting_connection' };
}

export async function upsertBookingSession(actor: SessionActor, bookingId: string, input: unknown) {
  if (!mongoose.isValidObjectId(bookingId)) fail('الطلب غير صحيح');
  const booking = await ActivityModel.findOne({ _id: bookingId, type: 'session_booked' }).lean();
  if (!booking) fail('الطلب غير موجود',404);
  if (actor.role !== 'admin' && (actor.role !== 'teacher' || booking!.teacherId !== actor.id)) fail('غير مصرح بهذا الطلب',403);
  const existing = await LiveSessionModel.findOne({ sourceKey: `booking:${bookingId}` });
  if (existing) return { session: sessionView(existing), lessonId: existing.source.lessonId, booking: serializeBooking(booking, true) };
  const data = await validateSessionInput(actor,input,booking!.scheduledDate,booking!.scheduledTime);
  if (data.provider === 'live_youtube') fail('الجلسة الخاصة تحتاج Zoom أو Meet أو Teams');
  return withSessionTransaction(async transaction => {
    const current = await ActivityModel.findById(bookingId).session(transaction);
    if (actor.role !== 'admin' && current?.teacherId !== actor.id) fail('تغير تخصيص الطلب',403);
    if (!current || ['cancelled','rejected'].includes(current.bookingStatus)) fail('الطلب ملغي أو مرفوض',409);
    const prior = await LiveSessionModel.findOne({ sourceKey: `booking:${bookingId}` }).session(transaction);
    if (prior) return { session: sessionView(prior), lessonId: prior.source.lessonId, booking: serializeBooking(current,true) };
    const lessonId = `private_booking_${bookingId}`;
    const item = new LiveSessionModel({ ...data, pathId: current!.pathId, levelId: current!.stageId, subjectId: current!.subjectId, sourceKey: `booking:${bookingId}`, source: { bookingId, lessonId }, audience: { kind: 'private', studentId: current!.userId }, title: current!.targetLabel || current!.title, createdBy: actor.id });
    await reserveSession(actor,item,transaction);
    await item.save({ session: transaction });
    await LessonModel.findOneAndUpdate({ bookingId }, { $setOnInsert: { id: lessonId, bookingId, sessionId: String(item._id), privateStudentId: current!.userId, title: item.title, type: item.provider, duration: data.duration, pathId: current!.pathId || null, subjectId: current!.subjectId || null, meetingDate: data.startAt.toISOString(), meetingUrl: '', assignedTeacherId: data.teacherId, assignedTeacherName: data.teacherName, approvalStatus: 'approved', showOnPlatform: false, isLocked: true, ownerType: 'platform', ownerId: actor.id, createdBy: actor.id } }, { upsert: true, new: true, session: transaction });
    current!.bookingStatus = 'confirmed'; current!.teacherId = data.teacherId; current!.assignedTeacherName = data.teacherName; current!.sessionId = String(item._id);
    await current!.save({ session: transaction });
    await writeSessionNotifications(item,actor.id,'confirmed',transaction);
    return { session: sessionView(item), lessonId, booking: serializeBooking(current,true) };
  });
}

export async function changeSession(actor: SessionActor, id: string, action: 'cancel' | 'reschedule' | 'complete', input?: unknown) {
  const original = await LiveSessionModel.findById(id);
  if (!original) fail('الحصة غير موجودة',404);
  const manager = actor.role === 'admin' || (actor.role === 'teacher' && original!.teacherId === actor.id);
  const ownStudent = original!.audience.kind === 'private' && original!.audience.studentId === actor.id;
  if (!manager && !(action === 'cancel' && ownStudent && +original!.startAt > Date.now())) fail('غير مصرح بهذا الإجراء',403);
  const data = action === 'reschedule' ? await validateSessionInput(actor,input) : undefined;
  return withSessionTransaction(async transaction => {
    const item = await LiveSessionModel.findById(id).session(transaction);
    if (!item || item.state !== 'confirmed') fail('الحصة ليست مؤكدة',409);
    const currentManager=actor.role==='admin' || (actor.role==='teacher' && item!.teacherId===actor.id);
    const currentStudent=item!.audience.kind==='private' && item!.audience.studentId===actor.id;
    if(!currentManager && !(action==='cancel' && currentStudent && +item!.startAt>Date.now()))fail('تغير تخصيص الحصة أو موعدها، أعد تحميلها',403);
    if (data) {
      if (item!.audience.kind === 'private' && data.provider === 'live_youtube') fail('لا يمكن تحويل جلسة خاصة إلى بث');
      Object.assign(item!,data); await reserveSession(actor,item,transaction);
      if(item!.source.bookingId) {
        await ActivityModel.updateOne({_id:item!.source.bookingId},{$set:{teacherId:item!.teacherId,assignedTeacherName:item!.teacherName}}).session(transaction);
        await LessonModel.updateOne({bookingId:item!.source.bookingId},{$set:{assignedTeacherId:item!.teacherId,assignedTeacherName:item!.teacherName,meetingDate:item!.startAt.toISOString(),duration:data.duration,type:item!.provider}}).session(transaction);
      }
    } else {
      if (action === 'complete' && +item!.startAt > Date.now()) fail('الحصة لم تبدأ');
      item!.state = action === 'cancel' ? 'cancelled' : 'completed';
      await LiveReservationModel.deleteMany({ sessionId: id }).session(transaction);
      if (item!.source.bookingId && action === 'cancel') await ActivityModel.updateOne({ _id: item!.source.bookingId }, { $set: { bookingStatus: 'cancelled' } }).session(transaction);
    }
    item!.changes.push({ action, actorId: actor.id, at: new Date().toISOString() });
    await writeSessionNotifications(item,actor.id,action,transaction);
    await item!.save({ session: transaction }); return sessionView(item);
  });
}
