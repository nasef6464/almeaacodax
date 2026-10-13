import mongoose from 'mongoose';
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ActivityModel } from "../models/Activity.js";
import { UserModel } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { upsertBookingSession, changeSession } from '../modules/content/liveSessions/sessionRepository.js';
import { assertHostingChoice } from '../modules/content/liveSessions/hostingPolicy.js';
import { bookingRequestSchema, createBookingRequest, serializeBooking } from '../modules/content/liveSessions/bookingRequests.js';
export const activityRouter = Router();

const createActivitySchema = bookingRequestSchema;

const adminBookingsQuerySchema = z.object({
  status: z.enum(["all", "pending", "confirmed", "rejected", "cancelled"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const updateBookingSchema = z.object({
  bookingStatus: z.enum(["pending", "confirmed", "rejected", "cancelled"]).optional(),
  teacherId: z.string().max(100).optional(),
  assignedTeacherName: z.string().max(160).optional(),
  adminNotes: z.string().max(2000).optional(),
});

const serializeActivity = serializeBooking;

activityRouter.use(requireAuth);

activityRouter.get(
  "/admin/session-bookings",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const query = adminBookingsQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = { type: "session_booked" };
    if (query.status !== "all") {
      filter.bookingStatus = query.status;
    }

    const activities = await ActivityModel.find(filter).sort({ createdAt: -1 }).limit(query.limit).lean();
    const userIds = Array.from(new Set(activities.map((activity) => String(activity.userId || "")).filter(Boolean)));
    const mongoUserIds = userIds.filter((id) => /^[a-f0-9]{24}$/i.test(id));
    const users = mongoUserIds.length
      ? await UserModel.find({ _id: { $in: mongoUserIds } }).select("name email role").lean()
      : [];
    const userById = new Map(users.map((user) => [String(user._id), user]));

    res.json({
      bookings: activities.map((activity) => {
        const student = userById.get(String(activity.userId || ""));
        return {
          ...serializeActivity(activity, true),
          studentName: student?.name || "",
          studentEmail: student?.email || "",
          studentRole: student?.role || "",
        };
      }),
    });
  }),
);

activityRouter.patch(
  "/admin/session-bookings/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = updateBookingSchema.parse(req.body || {});
    const update: Record<string, unknown> = {};
    const existing = await ActivityModel.findOne({ _id: req.params.id, type: 'session_booked' }).lean();
    if (!existing) return res.status(404).json({ message: 'Session booking request not found' });
    if (existing.sessionId && payload.teacherId) return res.status(409).json({message:'غيّر المدرس من إدارة الحصة'});
    if (payload.bookingStatus === 'confirmed') return res.status(409).json({ message: 'حدد الموعد والمدرس عبر تأكيد الحصة أولًا' });
    if (existing.sessionId && payload.bookingStatus && payload.bookingStatus !== 'cancelled') return res.status(409).json({ message: 'الحصة مرتبطة بحجز مؤكد؛ استخدم إدارة الحصة' });
    if (existing.sessionId && payload.bookingStatus === 'cancelled') {
      await changeSession({ id: req.authUser!.id, role: req.authUser!.role }, existing.sessionId, 'cancel');
      return res.json({booking:serializeActivity(await ActivityModel.findById(existing._id),true)});
    }
    if (payload.teacherId) {
      if(!mongoose.isValidObjectId(payload.teacherId))return res.status(400).json({message:'المدرس غير صحيح'});
      const teacher = await UserModel.findOne({ _id: payload.teacherId, role: 'teacher', isActive: { $ne: false } }).select('name').lean();
      if (!teacher) return res.status(400).json({ message: 'المدرس غير متاح' });
      update.teacherId = payload.teacherId; update.assignedTeacherName = teacher.name;
    }
    if (payload.bookingStatus) update.bookingStatus = payload.bookingStatus;
    if (typeof payload.assignedTeacherName === "string") update.assignedTeacherName = payload.assignedTeacherName.trim();
    if (typeof payload.adminNotes === "string") update.adminNotes = payload.adminNotes.trim();

    const activity = await ActivityModel.findOneAndUpdate(
      { _id: req.params.id, type: "session_booked", bookingStatus: existing.bookingStatus || { $in: [null,"pending"] }, sessionId: existing.sessionId || { $in: [null,""] } },
      { $set: update },
      { new: true },
    ).lean();

    if (!activity) {
      return res.status(409).json({ message: "تغير الطلب أثناء المراجعة، أعد تحميله" });
    }

    res.json({ booking: serializeActivity(activity) });
  }),
);

activityRouter.post(
  "/admin/session-bookings/:id/convert",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await assertHostingChoice(req.body.provider || 'zoom', req.body.hostingMode || 'manual_link');
    const result = await upsertBookingSession({ id: String(req.authUser!.id), role: req.authUser!.role }, req.params.id, req.body);
    res.json({ success: true, ...result });
  }),
);

activityRouter.get('/teacher/session-bookings', requireRole(['teacher']), asyncHandler(async (req,res) => {
 const bookings = await ActivityModel.find({ type: 'session_booked', teacherId: req.authUser!.id }).sort({createdAt:-1}).limit(100).lean();
 res.json({ bookings: bookings.map(item => serializeActivity(item,true)) });
}));
activityRouter.patch('/teacher/session-bookings/:id/reject', requireRole(['teacher']), asyncHandler(async(req,res)=>{
 const booking=await ActivityModel.findOneAndUpdate({_id:req.params.id,type:'session_booked',teacherId:req.authUser!.id,bookingStatus:'pending'},{$set:{bookingStatus:'rejected'}},{new:true});
 if(!booking)return res.status(409).json({message:'الطلب غير متاح للمراجعة'});res.json({booking:serializeActivity(booking,true)});
}));
activityRouter.patch('/me/session-bookings/:id/cancel', asyncHandler(async (req,res) => {
 const booking = await ActivityModel.findOne({ _id: req.params.id, type: 'session_booked', userId: req.authUser!.id });
 if (!booking) return res.status(404).json({message:'الطلب غير موجود'});
 if (booking.sessionId) await changeSession({id:req.authUser!.id,role:req.authUser!.role},booking.sessionId,'cancel');
 else if (booking.bookingStatus === 'pending') {
   const cancelled=await ActivityModel.findOneAndUpdate({_id:booking._id,userId:req.authUser!.id,bookingStatus:'pending',sessionId:{$in:[null,'']}},{$set:{bookingStatus:'cancelled'}},{new:true});
   if(!cancelled)return res.status(409).json({message:'تغير الطلب أثناء الإلغاء، أعد تحميله'});
   return res.json({booking:serializeActivity(cancelled)});
 }
 else return res.status(409).json({message:'الطلب لا يقبل الإلغاء'});
 res.json({booking:serializeActivity(await ActivityModel.findById(booking._id))});
}));
activityRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "");
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const activities = await ActivityModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ activities: activities.map(activity => serializeActivity(activity)) });
  }),
);

activityRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "");
    const payload = createActivitySchema.parse(req.body || {});
    const activity = await createBookingRequest({ id: userId }, payload);
    res.status(StatusCodes.CREATED).json({ activity });
  }),
);
