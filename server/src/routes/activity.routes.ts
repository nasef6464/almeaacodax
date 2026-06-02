import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ActivityModel } from "../models/Activity.js";
import { UserModel } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const activityRouter = Router();

const createActivitySchema = z.object({
  type: z.enum(["course_view", "lesson_complete", "quiz_complete", "skill_practice", "session_booked"]),
  title: z.string().min(2).max(240),
  link: z.string().max(300).optional().default(""),
  targetLabel: z.string().max(240).optional().default(""),
  scheduledDate: z.string().max(40).optional().default(""),
  scheduledTime: z.string().max(40).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
});

const adminBookingsQuerySchema = z.object({
  status: z.enum(["all", "pending", "confirmed", "cancelled"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const updateBookingSchema = z.object({
  bookingStatus: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  assignedTeacherName: z.string().max(160).optional().default(""),
  adminNotes: z.string().max(2000).optional().default(""),
});

const serializeActivity = (activity: any) => ({
  id: String(activity._id),
  userId: activity.userId || "",
  type: activity.type,
  title: activity.title,
  date: activity.date,
  link: activity.link || "",
  targetLabel: activity.targetLabel || "",
  scheduledDate: activity.scheduledDate || "",
  scheduledTime: activity.scheduledTime || "",
  notes: activity.notes || "",
  bookingStatus: activity.bookingStatus || "pending",
  assignedTeacherName: activity.assignedTeacherName || "",
  adminNotes: activity.adminNotes || "",
  createdAt: activity.createdAt,
});

activityRouter.use(requireAuth);

activityRouter.get(
  "/admin/session-bookings",
  requireRole(["admin", "supervisor", "teacher"]),
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
          ...serializeActivity(activity),
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
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = updateBookingSchema.parse(req.body || {});
    const update: Record<string, unknown> = {};
    if (payload.bookingStatus) update.bookingStatus = payload.bookingStatus;
    if (typeof payload.assignedTeacherName === "string") update.assignedTeacherName = payload.assignedTeacherName.trim();
    if (typeof payload.adminNotes === "string") update.adminNotes = payload.adminNotes.trim();

    const activity = await ActivityModel.findOneAndUpdate(
      { _id: req.params.id, type: "session_booked" },
      { $set: update },
      { new: true },
    ).lean();

    if (!activity) {
      return res.status(404).json({ message: "Session booking request not found" });
    }

    res.json({ booking: serializeActivity(activity) });
  }),
);

activityRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "");
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const activities = await ActivityModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ activities: activities.map(serializeActivity) });
  }),
);

activityRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "");
    const payload = createActivitySchema.parse(req.body || {});
    const activity = await ActivityModel.create({
      userId,
      ...payload,
      date: new Date().toISOString(),
    });
    res.status(StatusCodes.CREATED).json({ activity: serializeActivity(activity) });
  }),
);
