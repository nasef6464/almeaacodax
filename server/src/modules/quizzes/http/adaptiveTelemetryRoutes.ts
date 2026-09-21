import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { SkillProgressModel } from "../../../models/SkillProgress.js";
import { QuestionAttemptModel } from "../../../models/QuestionAttempt.js";
import { QuestionModel } from "../../../models/Question.js";
import { requireAuth } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildPaginatedResponse, resolvePagination } from "../../../utils/pagination.js";
import { questionAttemptSchema } from "./submissionSchemas.js";
import { buildQuestionAttemptDocument } from "../application/questionAttemptDocument.js";
import { updateSkillProgressFromQuestionAttempt } from "../application/quizSubmissionSideEffects.js";
import { buildDocumentQuery } from "../infrastructure/quizDocumentQuery.js";
import { summarizeRecentSkillEvidence } from "../analytics/skillAnalytics.js";

export const adaptiveTelemetryRouter = Router();

adaptiveTelemetryRouter.get(
  "/skill-progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const pathId = String(req.query.pathId || "").trim();
    const subjectId = String(req.query.subjectId || "").trim();
    const filter = { userId: req.authUser!.id, ...(pathId ? { pathId } : {}), ...(subjectId ? { subjectId } : {}) };
    const pagination = resolvePagination(req.query, { limit: 80 });
    const noTotal = ["true", "1", "yes", "on"].includes(String(req.query.noTotal || "").trim().toLowerCase());
    const rawItems = await SkillProgressModel.find(filter)
      .sort({ mastery: 1, lastAttemptAt: -1 })
      .skip(pagination.skip)
      .limit(noTotal ? pagination.limit + 1 : pagination.limit)
      .lean();
    const hasMore = noTotal && rawItems.length > pagination.limit;
    const items = noTotal ? rawItems.slice(0, pagination.limit) : rawItems;
    const total = noTotal
      ? pagination.skip + items.length + (hasMore ? 1 : 0)
      : await SkillProgressModel.countDocuments(filter);
    res.setHeader("X-Has-More", String(hasMore));
    res.json({
      skillProgress: items.map((item: any) => ({
        ...item,
        recent: summarizeRecentSkillEvidence(Array.isArray(item.recentEvidence) ? item.recentEvidence : []),
      })),
      pagination: buildPaginatedResponse([], pagination, total),
    });
  }),
);

adaptiveTelemetryRouter.get(
  "/question-attempts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filter = { userId: req.authUser!.id };
    const pagination = resolvePagination(req.query, { limit: 100 });
    const [items, total] = await Promise.all([
      QuestionAttemptModel.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      QuestionAttemptModel.countDocuments(filter),
    ]);
    res.json({
      questionAttempts: items,
      pagination: buildPaginatedResponse([], pagination, total),
    });
  }),
);

adaptiveTelemetryRouter.post(
  "/question-attempts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = questionAttemptSchema.parse(req.body);
    const question = await QuestionModel.findOne(buildDocumentQuery(payload.questionId)).select(
      "id pathId subject sectionId skillIds correctOptionIndex",
    );

    if (!question) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    const selectedOptionIndex = Number(payload.selectedOptionIndex);
    const isCorrect =
      selectedOptionIndex >= 0 && selectedOptionIndex === Number(question.correctOptionIndex ?? 0);
    const created = await QuestionAttemptModel.create(buildQuestionAttemptDocument({
      payload,
      selectedOptionIndex,
      isCorrect,
      userId: req.authUser!.id,
      question,
    }));
    await updateSkillProgressFromQuestionAttempt(created, req.authUser!.id);

    res.status(StatusCodes.CREATED).json(created);
  }),
);
