import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { QuestionModel } from "../models/Question.js";
import { ReviewCardModel } from "../models/ReviewCard.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sm2 } from "../services/spacedRepetition.js";

const answerSchema = z.object({
  quality: z.number().min(0).max(5),
});

const dueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reviewRouter = Router();

reviewRouter.get(
  "/due",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = dueQuerySchema.parse(req.query);
    const now = new Date();
    const userId = String(req.authUser!.id);

    const cards = await ReviewCardModel.find({
      userId,
      nextReviewDate: { $lte: now },
    })
      .sort({ nextReviewDate: 1, updatedAt: 1 })
      .limit(query.limit)
      .lean();

    const questionIds = cards.map((card: any) => String(card.questionId || "")).filter(Boolean);
    const questions = questionIds.length
      ? await QuestionModel.find({ id: { $in: questionIds } })
          .select("id text options imageUrl type skillIds")
          .lean()
      : [];
    const questionById = new Map(questions.map((question: any) => [String(question.id || question._id), question]));

    const items = cards
      .map((card: any) => {
        const question = questionById.get(String(card.questionId || ""));
        if (!question) return null;
        return {
          cardId: String(card.id || card._id),
          questionId: String(card.questionId || ""),
          skillId: String(card.skillId || ""),
          dueAt: card.nextReviewDate,
          interval: Number(card.interval || 1),
          repetitions: Number(card.repetitions || 0),
          easeFactor: Number(card.easeFactor || 2.5),
          question: {
            id: String(question.id || question._id),
            text: String(question.text || ""),
            options: Array.isArray(question.options) ? question.options.map(String) : [],
            imageUrl: String(question.imageUrl || ""),
            type: String(question.type || "mcq"),
            skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
          },
        };
      })
      .filter(Boolean);

    return res.json({
      dueCount: items.length,
      items,
    });
  }),
);

reviewRouter.post(
  "/:cardId/answer",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = answerSchema.parse(req.body);
    const userId = String(req.authUser!.id);

    if (!mongoose.Types.ObjectId.isValid(req.params.cardId)) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Review card not found" });
    }
    const card = await ReviewCardModel.findOne({ _id: req.params.cardId, userId });

    if (!card) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Review card not found" });
    }

    const next = sm2(
      {
        easeFactor: Number(card.easeFactor || 2.5),
        interval: Number(card.interval || 1),
        repetitions: Number(card.repetitions || 0),
      },
      payload.quality,
    );

    card.easeFactor = next.easeFactor;
    card.interval = next.interval;
    card.repetitions = next.repetitions;
    card.nextReviewDate = next.nextReviewDate;
    card.lastQuality = payload.quality;
    await card.save();

    return res.json({
      success: true,
      card: {
        id: String(card.id || card._id),
        nextReviewDate: card.nextReviewDate,
        interval: card.interval,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        lastQuality: card.lastQuality,
      },
    });
  }),
);

reviewRouter.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser!.id);
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [dueToday, dueThisWeek, totalCards] = await Promise.all([
      ReviewCardModel.countDocuments({ userId, nextReviewDate: { $lte: now } }),
      ReviewCardModel.countDocuments({ userId, nextReviewDate: { $lte: weekEnd } }),
      ReviewCardModel.countDocuments({ userId }),
    ]);

    return res.json({
      dueToday,
      dueThisWeek,
      totalCards,
    });
  }),
);
