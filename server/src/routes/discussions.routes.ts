import { randomUUID } from "node:crypto";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { resolvePagination, buildPaginatedResponse } from "../utils/pagination.js";
import { DiscussionThreadModel } from "../models/DiscussionThread.js";
import { DiscussionReplyModel } from "../models/DiscussionReply.js";
import { CourseModel } from "../models/Course.js";
import { UserModel } from "../models/User.js";

export const discussionRouter = Router();

const threadBodySchema = z.object({
  title: z.string().min(2).max(180),
  body: z.string().min(2).max(4000),
});

const replyBodySchema = z.object({
  body: z.string().min(2).max(4000),
});

const allowedEntityTypes = new Set(["lesson", "quiz", "course"]);

async function assertCanAccessEntity(userId: string, entityType: string, entityId: string, role: string) {
  if (["admin", "teacher", "supervisor"].includes(role)) return true;
  const user = await UserModel.findById(userId).select("enrolledCourses");
  if (!user) return false;
  if (entityType === "course") {
    return (user.enrolledCourses || []).map(String).includes(String(entityId));
  }
  // For lesson/quiz, allow student if enrolled in at least one visible course that contains references.
  const enrolledSet = new Set((user.enrolledCourses || []).map(String));
  if (!enrolledSet.size) return false;
  const courses = await CourseModel.find({ _id: { $in: Array.from(enrolledSet) } }).select("modules");
  for (const course of courses as any[]) {
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        if (entityType === "lesson" && String(lesson?.id || lesson?._id) === entityId) return true;
        if (entityType === "quiz" && String(lesson?.quizId || "") === entityId) return true;
      }
    }
  }
  return false;
}

discussionRouter.get(
  "/:entityType/:entityId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const entityType = String(req.params.entityType || "");
    const entityId = String(req.params.entityId || "");
    if (!allowedEntityTypes.has(entityType)) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid entity type" });

    const canAccess = await assertCanAccessEntity(req.authUser!.id, entityType, entityId, req.authUser!.role);
    if (!canAccess) return res.status(StatusCodes.FORBIDDEN).json({ message: "Not allowed to access discussions for this entity" });

    const pagination = resolvePagination(req.query, { limit: 30 });
    const filter = { entityType, entityId };
    const [threads, total] = await Promise.all([
      DiscussionThreadModel.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      DiscussionThreadModel.countDocuments(filter),
    ]);
    const threadIds = threads.map((thread: any) => String(thread.id || "")).filter(Boolean);
    const authorIds = Array.from(new Set(threads.map((thread: any) => String(thread.authorId || "")).filter(Boolean)));
    const [latestReplies, authors] = await Promise.all([
      threadIds.length
        ? DiscussionReplyModel.find({ threadId: { $in: threadIds } }).sort({ createdAt: -1 }).lean()
        : Promise.resolve([] as any[]),
      authorIds.length
        ? UserModel.find({ _id: { $in: authorIds } }).select("name").lean()
        : Promise.resolve([] as any[]),
    ]);

    const latestReplyByThreadId = new Map<string, any>();
    latestReplies.forEach((reply: any) => {
      const key = String(reply.threadId || "");
      if (!key || latestReplyByThreadId.has(key)) return;
      latestReplyByThreadId.set(key, reply);
    });
    const authorById = new Map(authors.map((author: any) => [String(author._id), String(author.name || "")]));

    const enrichedThreads = threads.map((thread: any) => {
      const latestReply = latestReplyByThreadId.get(String(thread.id || ""));
      return {
        ...thread,
        authorName: authorById.get(String(thread.authorId || "")) || "",
        latestReplyBody: latestReply ? String(latestReply.body || "") : "",
      };
    });

    res.json({ threads: enrichedThreads, pagination: buildPaginatedResponse([], pagination, total) });
  }),
);

discussionRouter.post(
  "/:entityType/:entityId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const entityType = String(req.params.entityType || "");
    const entityId = String(req.params.entityId || "");
    if (!allowedEntityTypes.has(entityType)) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid entity type" });
    const payload = threadBodySchema.parse(req.body);

    const canAccess = await assertCanAccessEntity(req.authUser!.id, entityType, entityId, req.authUser!.role);
    if (!canAccess) return res.status(StatusCodes.FORBIDDEN).json({ message: "Not allowed to post discussion here" });

    const created = await DiscussionThreadModel.create({
      id: randomUUID(),
      entityType,
      entityId,
      authorId: req.authUser!.id,
      title: payload.title.trim(),
      body: payload.body.trim(),
      upvotes: [],
      isPinned: false,
      isResolved: false,
      repliesCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

discussionRouter.post(
  "/:threadId/replies",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = replyBodySchema.parse(req.body);
    const threadId = String(req.params.threadId || "");
    const thread = await DiscussionThreadModel.findOne({ id: threadId });
    if (!thread) return res.status(StatusCodes.NOT_FOUND).json({ message: "Thread not found" });

    const canAccess = await assertCanAccessEntity(req.authUser!.id, String(thread.entityType), String(thread.entityId), req.authUser!.role);
    if (!canAccess) return res.status(StatusCodes.FORBIDDEN).json({ message: "Not allowed to reply in this thread" });

    const created = await DiscussionReplyModel.create({
      id: randomUUID(),
      threadId,
      authorId: req.authUser!.id,
      body: payload.body.trim(),
      upvotes: [],
      isInstructorReply: ["teacher", "admin", "supervisor"].includes(req.authUser!.role),
      isAcceptedAnswer: false,
      createdAt: Date.now(),
    });
    await DiscussionThreadModel.updateOne({ id: threadId }, { $inc: { repliesCount: 1 }, $set: { updatedAt: Date.now() } });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

discussionRouter.post(
  "/:threadId/resolve",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!["teacher", "admin", "supervisor"].includes(req.authUser!.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Only instructor/admin can resolve threads" });
    }
    const threadId = String(req.params.threadId || "");
    const updated = await DiscussionThreadModel.findOneAndUpdate(
      { id: threadId },
      { $set: { isResolved: true, updatedAt: Date.now() } },
      { new: true },
    ).lean();
    if (!updated) return res.status(StatusCodes.NOT_FOUND).json({ message: "Thread not found" });
    res.json(updated);
  }),
);
