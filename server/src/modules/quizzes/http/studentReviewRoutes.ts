import mongoose from "mongoose";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.js";
import { QuestionModel } from "../../../models/Question.js";
import { ReviewCardModel } from "../../../models/ReviewCard.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

const libraryQuerySchema = z.object({
  tab: z.enum(["saved", "mistakes", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pathId: z.string().trim().optional().default(""),
  subjectId: z.string().trim().optional().default(""),
});

const buildQuestionBatchQuery = (ids: string[]) => {
  const uniqueIds = [...new Set(ids.map((value) => String(value || "").trim()).filter(Boolean))];
  const objectIds = uniqueIds
    .filter((value) => mongoose.Types.ObjectId.isValid(value))
    .map((value) => new mongoose.Types.ObjectId(value));
  return {
    $or: [
      { id: { $in: uniqueIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const reviewLibraryFilter = (
  userId: string,
  tab: "saved" | "mistakes" | "all",
  pathId = "",
  subjectId = "",
) => {
  const reasonFilter =
    tab === "saved"
      ? { savedForReview: true }
      : tab === "mistakes"
        ? { $or: [{ hasMistake: true }, { reviewType: "error_recovery" }] }
        : { $or: [{ savedForReview: true }, { hasMistake: true }, { reviewType: "error_recovery" }] };
  return {
    userId,
    ...reasonFilter,
    ...(pathId ? { pathId } : {}),
    ...(subjectId ? { subjectId } : {}),
  };
};

export const studentReviewRouter = Router();

studentReviewRouter.get(
  "/library",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = libraryQuerySchema.parse(req.query);
    const userId = String(req.authUser!.id);
    const filter = reviewLibraryFilter(userId, query.tab, query.pathId, query.subjectId);
    const skip = (query.page - 1) * query.limit;

    const [cards, savedCount, mistakeCount, selectedCount] = await Promise.all([
      ReviewCardModel.find(filter)
        .select("questionId skillId skillIds pathId subjectId sectionId reviewType savedForReview savedAt hasMistake nextReviewDate updatedAt")
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      ReviewCardModel.countDocuments(reviewLibraryFilter(userId, "saved", query.pathId, query.subjectId)),
      ReviewCardModel.countDocuments(reviewLibraryFilter(userId, "mistakes", query.pathId, query.subjectId)),
      ReviewCardModel.countDocuments(filter),
    ]);

    const questionIds = cards.map((card: any) => String(card.questionId || "")).filter(Boolean);
    const questions = questionIds.length
      ? await QuestionModel.find(buildQuestionBatchQuery(questionIds))
          .select("id questionCode text options correctOptionIndex explanation hint solvingStrategy videoUrl imageUrl imageAlt optionsEmbeddedInImage aiContext voiceExplanation skillIds skillId subSkillId pathId subject subjectId sectionId type")
          .lean()
      : [];

    const questionById = new Map<string, any>();
    questions.forEach((question: any) => {
      const canonical = String(question.id || question._id || "");
      const mongoId = String(question._id || "");
      if (canonical) questionById.set(canonical, question);
      if (mongoId) questionById.set(mongoId, question);
    });

    const items = cards.flatMap((card: any) => {
      const question = questionById.get(String(card.questionId || ""));
      if (!question) return [];
      return [{
        cardId: String(card._id || card.id || ""),
        questionId: String(card.questionId || ""),
        reasons: {
          saved: Boolean(card.savedForReview),
          mistake: Boolean(card.hasMistake || card.reviewType === "error_recovery"),
        },
        reviewType: String(card.reviewType || "error_recovery"),
        dueAt: card.nextReviewDate,
        question: {
          id: String(question.id || question._id || ""),
          questionCode: String(question.questionCode || ""),
          text: String(question.text || ""),
          options: Array.isArray(question.options) ? question.options.map(String) : [],
          correctOptionIndex: Number(question.correctOptionIndex ?? 0),
          explanation: String(question.explanation || ""),
          hint: String(question.hint || ""),
          solvingStrategy: String(question.solvingStrategy || ""),
          videoUrl: String(question.videoUrl || ""),
          imageUrl: String(question.imageUrl || ""),
          imageAlt: String(question.imageAlt || ""),
          optionsEmbeddedInImage: Boolean(question.optionsEmbeddedInImage),
          aiContext: question.aiContext || undefined,
          voiceExplanation: question.voiceExplanation || undefined,
          skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
          skillId: question.skillId ? String(question.skillId) : undefined,
          subSkillId: question.subSkillId ? String(question.subSkillId) : undefined,
          pathId: String(question.pathId || ""),
          subject: String(question.subject || ""),
          subjectId: String(question.subjectId || ""),
          sectionId: String(question.sectionId || ""),
          type: String(question.type || "mcq"),
        },
      }];
    });

    return res.json({
      tab: query.tab,
      counts: { saved: savedCount, mistakes: mistakeCount },
      page: query.page,
      limit: query.limit,
      total: selectedCount,
      hasMore: skip + cards.length < selectedCount,
      items,
    });
  }),
);

studentReviewRouter.put(
  "/questions/:questionId/saved",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser!.id);
    const requestedQuestionId = String(req.params.questionId || "").trim();
    const question = await QuestionModel.findOne(buildQuestionBatchQuery([requestedQuestionId]))
      .select("id pathId subject subjectId sectionId skillIds")
      .lean();
    if (!question) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Review question not found" });
    }

    const questionId = String((question as any).id || (question as any)._id || requestedQuestionId);
    const skillIds = Array.isArray((question as any).skillIds) ? (question as any).skillIds.map(String) : [];
    const card = await ReviewCardModel.findOneAndUpdate(
      { userId, questionId },
      {
        $setOnInsert: {
          userId,
          questionId,
          reviewType: "saved_review",
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(),
          lastQuality: 0,
        },
        $set: {
          savedForReview: true,
          savedAt: new Date(),
          skillId: skillIds[0] || "",
          skillIds,
          pathId: String((question as any).pathId || ""),
          subjectId: String((question as any).subjectId || (question as any).subject || ""),
          sectionId: String((question as any).sectionId || ""),
        },
      },
      { upsert: true, new: true },
    );

    return res.json({ success: true, cardId: String(card?._id || ""), questionId });
  }),
);

studentReviewRouter.delete(
  "/questions/:questionId/saved",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser!.id);
    const requestedQuestionId = String(req.params.questionId || "").trim();
    const question = await QuestionModel.findOne(buildQuestionBatchQuery([requestedQuestionId]))
      .select("id")
      .lean();
    const questionIds = [
      requestedQuestionId,
      String((question as any)?.id || ""),
      String((question as any)?._id || ""),
    ].filter(Boolean);

    const card = await ReviewCardModel.findOne({ userId, questionId: { $in: questionIds } });
    if (!card) return res.json({ success: true });

    if (String(card.reviewType || "") === "saved_review" && !Boolean(card.hasMistake)) {
      await ReviewCardModel.deleteOne({ _id: card._id, userId });
    } else {
      card.savedForReview = false;
      card.savedAt = undefined;
      await card.save();
    }
    return res.json({ success: true });
  }),
);
