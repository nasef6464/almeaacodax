import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TopicModel } from "../models/Topic.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { GroupModel } from "../models/Group.js";

const topicSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  parentId: z.string().nullable().optional(),
  order: z.number().default(0),
  lessonIds: z.array(z.string()).default([]),
  quizIds: z.array(z.string()).default([]),
});

const lessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  pathId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  type: z.enum(["video", "quiz", "file", "assignment", "text", "live_youtube", "zoom", "google_meet", "teams"]),
  duration: z.string().default(""),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  quizId: z.string().nullable().optional(),
  order: z.number().default(0),
  isLocked: z.boolean().default(false),
  skillIds: z.array(z.string()).default([]),
});

const librarySchema = z.object({
  title: z.string().min(1),
  size: z.string().default(""),
  downloads: z.number().default(0),
  type: z.enum(["pdf", "doc", "video"]).default("pdf"),
  subjectId: z.string().min(1),
  url: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SCHOOL", "CLASS", "PRIVATE_GROUP"]),
  parentId: z.string().nullable().optional(),
  ownerId: z.string().min(1),
  supervisorIds: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  courseIds: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

export const contentRouter = Router();

contentRouter.get(
  "/bootstrap",
  asyncHandler(async (_req, res) => {
    const [topics, lessons, libraryItems, groups] = await Promise.all([
      TopicModel.find().sort({ subjectId: 1, order: 1 }),
      LessonModel.find().sort({ createdAt: -1 }),
      LibraryItemModel.find().sort({ createdAt: -1 }),
      GroupModel.find().sort({ createdAt: -1 }),
    ]);

    res.json({ topics, lessons, libraryItems, groups });
  }),
);

contentRouter.post(
  "/topics",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = topicSchema.parse(req.body);
    const created = await TopicModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.post(
  "/lessons",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = lessonSchema.parse(req.body);
    const created = await LessonModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.post(
  "/library-items",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = librarySchema.parse(req.body);
    const created = await LibraryItemModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.post(
  "/groups",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.parse(req.body);
    const created = await GroupModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);
