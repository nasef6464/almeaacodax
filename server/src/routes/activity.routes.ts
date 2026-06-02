import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { ActivityModel } from "../models/Activity.js";
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

const serializeActivity = (activity: any) => ({
  id: String(activity._id),
  type: activity.type,
  title: activity.title,
  date: activity.date,
  link: activity.link || "",
  targetLabel: activity.targetLabel || "",
  scheduledDate: activity.scheduledDate || "",
  scheduledTime: activity.scheduledTime || "",
  notes: activity.notes || "",
  createdAt: activity.createdAt,
});

activityRouter.use(requireAuth);

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
