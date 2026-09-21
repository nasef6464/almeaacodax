import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { LessonModel } from "../../../models/Lesson.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { TopicModel } from "../../../models/Topic.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { assertManagedContentScope } from "../../../services/managedContentScope.js";
import { sanitizeLessonResourcePayload } from "../domain/learningResourceUrl.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";
import {
  buildOwnedDocumentQuery,
  getWorkflowDefaults,
  hasTopicManagementScope,
  sanitizeWorkflowUpdate,
} from "../application/learningContentWorkflow.js";
import {
  lessonSchema,
  librarySchema,
  libraryUpdateSchema,
  topicSchema,
  topicUpdateSchema,
} from "./learningContentSchemas.js";

const sanitizeLessonPayload = sanitizeLessonResourcePayload;

export const contentLearningRouter = Router();

contentLearningRouter.post(
  "/topics",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = topicSchema.parse(req.body);
    await assertManagedContentScope(req.authUser!, payload);
    const created = await TopicModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentLearningRouter.patch(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = topicUpdateSchema.parse(req.body);
    const existing = await TopicModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });

    const canManageTopic = hasTopicManagementScope(req.authUser!, existing as any);
    if (!canManageTopic) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this topic" });
    }

    const updated = await TopicModel.findOneAndUpdate(buildDocumentQuery(String(existing._id)), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json(updated);
  }),
);

contentLearningRouter.delete(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await TopicModel.findOne(buildDocumentQuery(req.params.id));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    await assertManagedContentScope(req.authUser!, existing.toObject());

    const canManageTopic = hasTopicManagementScope(req.authUser!, existing as any);
    if (!canManageTopic) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "You do not have access to this topic" });
    }

    const deleted = await TopicModel.findOneAndDelete(buildDocumentQuery(String(existing._id)));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json({ success: true });
  }),
);

contentLearningRouter.post(
  "/lessons",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.parse(req.body));
    await assertManagedContentScope(req.authUser!, payload);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LessonModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentLearningRouter.patch(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.partial().parse(req.body));
    const existing = await LessonModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }
    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LessonModel.findOneAndUpdate({ _id: existing._id }, sanitizedPayload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }

    return res.json(updated);
  }),
);

contentLearningRouter.delete(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await LessonModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await LessonModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ lessonIds: { $in: deletedIds } }, { $pull: { lessonIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

contentLearningRouter.post(
  "/library-items",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = librarySchema.parse(req.body);
    await assertManagedContentScope(req.authUser!, payload);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LibraryItemModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentLearningRouter.patch(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const payload = libraryUpdateSchema.parse(req.body);
    const existing = await LibraryItemModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }
    await assertManagedContentScope(req.authUser!, { ...existing.toObject(), ...payload });
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LibraryItemModel.findOneAndUpdate(
      { _id: existing._id },
      sanitizedPayload,
      {
        new: true,
      },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }

    return res.json(updated);
  }),
);

contentLearningRouter.delete(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const existing = await LibraryItemModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!));
    if (!existing) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }
    await assertManagedContentScope(req.authUser!, existing.toObject());
    const deleted = await LibraryItemModel.findOneAndDelete({ _id: existing._id });
    if (!deleted) return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ libraryItemIds: { $in: deletedIds } }, { $pull: { libraryItemIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);
