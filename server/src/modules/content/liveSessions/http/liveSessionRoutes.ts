import { loadSessionAccess } from '../sourceAccess.js';
import { UserModel } from '../../../../models/User.js';
import { validateRecordingLink } from '../meetingLinkPolicy.js';
import { assertManagedContentScope } from '../../../../services/managedContentScope.js';
import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireActiveAuth, requireRole } from '../../../../middleware/auth.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { LiveSessionModel } from '../../../../models/LiveSession.js';
import { LiveHostModel } from '../../../../models/LiveHost.js';
import { CourseModel } from '../../../../models/Course.js';
import { LessonModel } from '../../../../models/Lesson.js';
import { PlatformIntegrationSettingsModel } from '../../../../models/PlatformIntegrationSettings.js';
import { sessionView, changeSession, upsertBookingSession, validateSessionInput } from '../sessionRepository.js';
import { reserveSession, withSessionTransaction, fail } from '../scheduling.js';
import { loadHostingPolicy, hostingPolicySchema, assertHostingChoice } from '../hostingPolicy.js';
import type { SessionActor } from '../contracts.js';

export const liveSessionRouter = Router();
liveSessionRouter.get('/policy',asyncHandler(async(_req,res)=>{res.json({policy:await loadHostingPolicy()});}));
liveSessionRouter.get('/public',asyncHandler(async(_req,res)=>{
 const items=await LiveSessionModel.find({'audience.kind':'public'}).sort({startAt:-1}).limit(100).lean(),policy=await loadHostingPolicy();
 const access=await loadSessionAccess(undefined,items);
 res.json({sessions:items.filter(access.allowed).map(item=>sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes))});
}));
liveSessionRouter.get('/public/:id/:entry',asyncHandler(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id) || !['join','recording'].includes(req.params.entry))fail('الحصة غير موجودة',404);
 const item=await LiveSessionModel.findOne({_id:req.params.id,'audience.kind':'public'}).lean();if(!item || !(await loadSessionAccess(undefined,[item])).allowed(item))fail('الحصة غير متاحة',404);
 const policy=await assertHostingChoice(item!.provider,item!.hostingMode),view=sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes);
 if(req.params.entry==='recording' ? !view.hasRecording : !view.canJoin)fail('الدخول غير متاح الآن',409);
 res.setHeader('Cache-Control','no-store');res.json({participantUrl:req.params.entry==='recording'?validateRecordingLink(item!.provider,item!.recordingUrl):item!.meetingUrl});
}));
liveSessionRouter.use(requireAuth, requireActiveAuth);
const actorOf = (req: any): SessionActor => ({ id: req.authUser.id, role: req.authUser.role, groupIds: req.authUser.groupIds || [] });
const identity = (id: string) => mongoose.isValidObjectId(id) ? { $or: [{ _id: id }, { id }] } : { id };
const courseIdentity = (id: string) => ({ _id: id });
liveSessionRouter.get('/source',asyncHandler(async(req,res)=>{
 const source=z.object({courseId:z.string().min(1).max(100),lessonId:z.string().min(1).max(100)}).parse(req.query);
 const course=await CourseModel.findOne(courseIdentity(source.courseId)).select('_id').lean();
 const item=course?await LiveSessionModel.findOne({sourceKey:`course:${course._id}:${source.lessonId}`}).lean():null;
 if(!item || !(await loadSessionAccess(actorOf(req),[item])).allowed(item))fail('موعد الحصة غير متاح',404);
 const policy=await loadHostingPolicy();res.setHeader('Cache-Control','no-store');res.json({session:sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes)});
}));
liveSessionRouter.patch('/policy', requireRole(['admin']), asyncHandler(async (req,res) => {
  const policy = hostingPolicySchema.parse(req.body);
  await PlatformIntegrationSettingsModel.updateOne({ key: 'default' }, { $set: { liveSessionPolicy: policy } }, { upsert: true, runValidators: true });
  res.json({ policy });
}));
liveSessionRouter.get('/teachers', requireRole(['admin','teacher']), asyncHandler(async(req,res)=>{
 const actor = actorOf(req); const teachers = await UserModel.find(actor.role === 'admin' ? {role:{$in:['teacher','admin']},isActive:{$ne:false}} : {_id:actor.id}).select('name liveSessionDefaultHostingMode').limit(100).lean();
 res.json({teachers:teachers.map(teacher=>({id:String(teacher._id),name:teacher.name,defaultHostingMode:teacher.liveSessionDefaultHostingMode}))});
}));
liveSessionRouter.patch('/teachers/:id/default', requireRole(['admin','teacher']), asyncHandler(async(req,res)=>{
 const actor=actorOf(req); if(actor.role!=='admin' && actor.id!==req.params.id)fail('غير مصرح',403);
 const {hostingMode}=z.object({hostingMode:z.enum(['teacher_account','platform_account','manual_link'])}).parse(req.body);
 const policy=await loadHostingPolicy();if(!(policy.hostingModes as string[]).includes(hostingMode))fail('الاختيار معطل من الإدارة');
 const teacher=await UserModel.findOneAndUpdate({_id:req.params.id,role:{$in:['teacher','admin']}},{$set:{liveSessionDefaultHostingMode:hostingMode}},{new:true});
 if(!teacher)fail('المدرس غير موجود',404);res.json({success:true});
}));
liveSessionRouter.get('/hosts', requireRole(['admin','teacher']), asyncHandler(async (req,res) => {
  const actor = actorOf(req);
  const hosts = await LiveHostModel.find(actor.role === 'admin' ? {} : { $or: [{ ownerId: actor.id, ownerType: 'teacher' }, { ownerType: 'platform', enabled: true }] }).select('label ownerType ownerId provider capacity enabled connected').limit(100).lean();
  res.json({ hosts: hosts.map(host => ({ ...host, id: String(host._id) })) });
}));
liveSessionRouter.post('/hosts', requireRole(['admin','teacher']), asyncHandler(async (req,res) => {
  const input = z.object({ label: z.string().min(2).max(120), provider: z.enum(['zoom','google_meet','teams','live_youtube']), ownerType: z.enum(['teacher','platform']), ownerId: z.string().max(100).optional(), capacity: z.number().int().min(1).max(100).default(1) }).strict().parse(req.body);
  const actor = actorOf(req);
  if (actor.role !== 'admin' && (input.ownerType !== 'teacher' || (input.ownerId && input.ownerId !== actor.id))) fail('غير مصرح بإنشاء هذا الحساب',403);
  if(input.ownerType==='teacher' && input.ownerId) {
    if(!mongoose.isValidObjectId(input.ownerId))fail('صاحب الحساب غير صحيح');
    const owner=await UserModel.findOne({_id:input.ownerId,role:{$in:['teacher','admin']},isActive:{$ne:false}}).select('_id').lean();if(!owner)fail('صاحب الحساب غير متاح');
  }
  const host = await LiveHostModel.create({ ...input, ownerId: input.ownerType === 'platform' ? actor.id : input.ownerId || actor.id, connected: false });
  res.status(201).json({ host: { id: String(host._id), label: host.label, provider: host.provider, capacity: host.capacity, connected: false } });
}));
liveSessionRouter.patch('/hosts/:id',requireRole(['admin','teacher']),asyncHandler(async(req,res)=>{
 const actor=actorOf(req);if(!mongoose.isValidObjectId(req.params.id))fail('الحساب غير موجود',404);
 const input=z.object({enabled:z.boolean().optional(),label:z.string().min(2).max(120).optional()}).strict().parse(req.body);
 const host=await LiveHostModel.findOneAndUpdate({_id:req.params.id,...(actor.role==='admin'?{}:{ownerType:'teacher',ownerId:actor.id})},{$set:input},{new:true});
 if(!host)fail('الحساب غير متاح للإدارة',403);res.json({success:true});
}));
liveSessionRouter.get(['/me','/manage'], asyncHandler(async (req,res) => {
  const actor = actorOf(req), manage = req.path === '/manage';
  if (manage && !['admin','teacher'].includes(actor.role)) fail('غير مصرح',403);
  const filter = manage ? (actor.role === 'admin' ? {} : { teacherId: actor.id }) : { $or: [{ 'audience.kind': 'public' }, { 'audience.kind': 'course' }, { 'audience.studentId': actor.id }, { 'audience.groupIds': { $in: actor.groupIds || [] } }, { teacherId: actor.id }] };
  const items = await LiveSessionModel.find(filter).sort({ startAt: -1 }).limit(100).lean();
  const policy = await loadHostingPolicy();
  const access=await loadSessionAccess(actor,items);
  const visible=items.filter(item=>manage || access.allowed(item)).map(item=>({...sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes),canJoin:access.sourceVisible(item) && policy.providers.includes(item.provider as any) && policy.hostingModes.includes(item.hostingMode as any) && sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes).canJoin,...(manage?{management:{hostId:item.hostId,meetingUrl:item.meetingUrl,recordingUrl:item.recordingUrl,showRecording:item.showRecording}}:{})}));
  res.json({ sessions: visible });
}));
liveSessionRouter.get('/:id/join', asyncHandler(async (req,res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail('الحصة غير موجودة',404);
  const item = await LiveSessionModel.findById(req.params.id).lean();
  if (!item || !(await loadSessionAccess(actorOf(req),[item])).allowed(item)) fail('الحصة غير متاحة لك',403);
  const policy = await assertHostingChoice(item!.provider,item!.hostingMode);
  if (!sessionView(item,policy.earlyJoinMinutes,policy.lateJoinMinutes).canJoin) fail('الدخول غير متاح الآن أو الرابط قيد التجهيز',409);
  res.setHeader('Cache-Control','no-store'); res.json({ participantUrl: item!.meetingUrl });
}));
liveSessionRouter.get('/:id/recording',asyncHandler(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))fail('الحصة غير موجودة',404);
 const item=await LiveSessionModel.findById(req.params.id).lean();
 if(!item || !(await loadSessionAccess(actorOf(req),[item])).allowed(item) || !sessionView(item).hasRecording)fail('التسجيل غير متاح',403);
 res.setHeader('Cache-Control','no-store');res.json({participantUrl:validateRecordingLink(item!.provider,item!.recordingUrl)});
}));
liveSessionRouter.patch('/:id/recording',requireRole(['admin','teacher']),asyncHandler(async(req,res)=>{
 if(!mongoose.isValidObjectId(req.params.id))fail('الحصة غير موجودة',404);
 const input=z.object({url:z.string().max(2000),show:z.boolean()}).parse(req.body),actor=actorOf(req);
 const item=await LiveSessionModel.findById(req.params.id);
 if(!item || (actor.role!=='admin' && item.teacherId!==actor.id))fail('غير مصرح',403);
 item!.recordingUrl=input.url?validateRecordingLink(item!.provider,input.url):'';item!.showRecording=input.show;
 await item!.save();res.json({session:sessionView(item)});
}));
liveSessionRouter.post('/bookings/:id/confirm', requireRole(['admin','teacher']), asyncHandler(async (req,res) => {
  await assertHostingChoice(req.body.provider || 'zoom',req.body.hostingMode || 'manual_link');
  res.json(await upsertBookingSession(actorOf(req),req.params.id,req.body));
}));
liveSessionRouter.patch('/:id', asyncHandler(async (req,res) => {
  if (!mongoose.isValidObjectId(req.params.id)) fail('الحصة غير موجودة',404);
  const { action, input } = z.object({ action: z.enum(['cancel','reschedule','complete']), input: z.unknown().optional() }).parse(req.body);
  if (action === 'reschedule') {
    const candidate = input as any; await assertHostingChoice(candidate?.provider || 'zoom',candidate?.hostingMode || 'manual_link');
  }
  res.json({ session: await changeSession(actorOf(req),req.params.id,action,input) });
}));
liveSessionRouter.post('/', requireRole(['admin','teacher']), asyncHandler(async (req,res) => {
  const actor = actorOf(req);
  const source = z.object({ lessonId: z.string().min(1).max(100), courseId: z.string().max(100).optional() }).strict().parse(req.body.source);
  let lesson: any, course: any;
  if (source.courseId) {
    course = await CourseModel.findOne(courseIdentity(source.courseId)).lean();
    if (!course || (actor.role !== 'admin' && course.ownerId !== actor.id)) fail('الدورة غير متاحة للإدارة',403);
    lesson = (course!.modules || []).flatMap((module: any) => module.lessons || []).find((candidate: any) => String(candidate.id || candidate._id) === source.lessonId);
  } else { lesson = await LessonModel.findOne(identity(source.lessonId)).lean(); }
  if (!lesson || String(lesson.id || '').startsWith('live_conv_') || lesson.bookingId || lesson.privateStudentId || !['zoom','google_meet','teams','live_youtube'].includes(lesson.type) || (actor.role !== 'admin' && !source.courseId && lesson.ownerId !== actor.id)) fail('اختر درسًا مباشرًا متاحًا',403);
  if (!source.courseId && actor.role !== 'admin') fail('الحصص الجماعية المستقلة تحتاج موافقة الإدارة',403);
  await assertManagedContentScope(actor,course || lesson);
  const data = await validateSessionInput(actor,req.body.input);
  await assertHostingChoice(data.provider,data.hostingMode);
  const audience = source.courseId ? { kind: 'course', courseId: source.courseId } : z.discriminatedUnion('kind',[z.object({kind:z.literal('public')}),z.object({kind:z.literal('group'),groupIds:z.array(z.string().min(1)).min(1).max(100)})]).parse(req.body.audience);
  const sourceKey = source.courseId ? `course:${course!._id}:${source.lessonId}` : `lesson:${lesson.id || lesson._id}`;
  const result = await withSessionTransaction(async transaction => {
    const prior = await LiveSessionModel.findOne({ sourceKey }).session(transaction);
    if (prior) return sessionView(prior);
    const item = new LiveSessionModel({ ...data, pathId:(course||lesson).pathId || '', levelId:(course||lesson).levelId || '', subjectId:(course||lesson).subjectId || '', source, sourceKey, audience, title: lesson.title, createdBy: actor.id });
    await reserveSession(actor,item,transaction); await item.save({session:transaction});
    if (source.courseId) {
      const latest = await CourseModel.findById(course!._id).session(transaction).lean();
      let target = '';
      (latest!.modules || []).forEach((module:any,m:number)=>(module.lessons||[]).forEach((candidate:any,l:number)=>{if(String(candidate.id||candidate._id)===source.lessonId)target=`modules.${m}.lessons.${l}.sessionId`;}));
      if (!target) fail('تغير درس الدورة، أعد تحميله',409);
      await CourseModel.updateOne({_id:course!._id},{$set:{[target]:String(item._id)}}).session(transaction);
    } else {
      await LessonModel.updateOne({_id:lesson._id},{$set:{sessionId:String(item._id)}}).session(transaction);
    }
    return sessionView(item);
  });
  res.status(201).json({ session: result });
}));
