import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { CourseModel } from "../../../models/Course.js";
import { LessonModel } from "../../../models/Lesson.js";
import { LibraryItemModel } from "../../../models/LibraryItem.js";
import { QuestionModel } from "../../../models/Question.js";
import { QuizModel } from "../../../models/Quiz.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildPaginationMeta, escapeRegExp } from "./contentQueryUtilities.js";
import { buildDocumentQuery } from "../infrastructure/contentDocumentQuery.js";

const reviewQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  type: z.enum(["course", "lesson", "question", "quiz", "library"]).optional(),
  search: z.string().trim().max(120).optional(),
});

const reviewDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewerNotes: z.string().trim().max(2000).default(""),
  publish: z.boolean().optional(),
});

export const contentReviewRouter = Router();

contentReviewRouter.get(
  "/review-queue",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const query = reviewQueueQuerySchema.parse(req.query);
    const search = query.search ? new RegExp(escapeRegExp(query.search), "i") : null;
    const types = query.type ? [query.type] : ["course", "lesson", "question", "quiz", "library"] as const;
    const definitions: Record<string, { model: any; title: string }> = {
      course: { model: CourseModel, title: "$title" },
      lesson: { model: LessonModel, title: "$title" },
      question: { model: QuestionModel, title: "$text" },
      quiz: { model: QuizModel, title: "$title" },
      library: { model: LibraryItemModel, title: "$title" },
    } as const;

    const pending = await Promise.all(types.map(async (type) => {
      const definition = definitions[type];
      const filter: Record<string, unknown> = { approvalStatus: "pending_review" };
      if (search) {
        filter.$or = type === "question" ? [{ text: search }] : [{ title: search }];
      }
      const items = await definition.model.find(filter)
        .select("_id id title text ownerId createdBy assignedTeacherId pathId subjectId subject approvalStatus updatedAt")
        .lean();

      return items.map((item: any) => ({
        id: String(item.id || item._id),
        type,
        title: String(item.title || item.text || "عنصر بلا عنوان"),
        ownerId: String(item.assignedTeacherId || item.ownerId || item.createdBy || ""),
        pathId: String(item.pathId || ""),
        subjectId: String(item.subjectId || item.subject || ""),
        approvalStatus: "pending_review",
        updatedAt: item.updatedAt || null,
      }));
    }));

    const allItems = pending
      .flat()
      .sort((left: any, right: any) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
    const skip = (query.page - 1) * query.limit;

    return res.json({
      items: allItems.slice(skip, skip + query.limit),
      pagination: buildPaginationMeta(allItems.length, query.page, query.limit),
    });
  }),
);

contentReviewRouter.patch(
  "/review-queue/:type/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const type = z.enum(["course", "lesson", "question", "quiz", "library"]).parse(req.params.type);
    const payload = reviewDecisionSchema.parse(req.body);
    const models: Record<string, any> = {
      course: CourseModel,
      lesson: LessonModel,
      question: QuestionModel,
      quiz: QuizModel,
      library: LibraryItemModel,
    };
    const model = models[type];
    const item = await model.findOne(buildDocumentQuery(req.params.id));

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Review item not found" });
    }

    const update: Record<string, unknown> = {
      approvalStatus: payload.decision,
      reviewerNotes: payload.reviewerNotes,
      approvedBy: req.authUser!.id,
      approvedAt: Date.now(),
    };

    if (payload.decision === "rejected") {
      update.isPublished = false;
      update.showOnPlatform = false;
    } else if (type !== "question" && payload.publish === true) {
      update.isPublished = true;
      update.showOnPlatform = true;
    }

    const updated = await model.findOneAndUpdate({ _id: item._id }, update, { new: true });
    return res.json({ item: updated, decision: payload.decision });
  }),
);
