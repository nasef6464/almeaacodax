import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { QuestionModel } from "../models/Question.js";
import { ReviewCardModel } from "../models/ReviewCard.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sm2 } from "../services/spacedRepetition.js";

const answerSchema = z.object({
  quality: z.number().min(0).max(5),
});

const dueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  pathId: z.string().optional().default(""),
  subjectId: z.string().optional().default(""),
});

const masteryChallengeQuerySchema = z.object({
  pathId: z.string().min(1),
  subjectId: z.string().optional().default(""),
  limit: z.coerce.number().int().min(1).max(20).default(5),
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
      ...(query.pathId ? { pathId: query.pathId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
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
          pathId: String(card.pathId || ""),
          subjectId: String(card.subjectId || ""),
          sectionId: String(card.sectionId || ""),
          reviewType: String(card.reviewType || "error_recovery"),
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
    const query = dueQuerySchema.parse(req.query);
    const userId = String(req.authUser!.id);
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const scope = {
      userId,
      ...(query.pathId ? { pathId: query.pathId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    };

    const [dueToday, dueThisWeek, totalCards, masteryReviewDue] = await Promise.all([
      ReviewCardModel.countDocuments({ ...scope, nextReviewDate: { $lte: now } }),
      ReviewCardModel.countDocuments({ ...scope, nextReviewDate: { $lte: weekEnd } }),
      ReviewCardModel.countDocuments(scope),
      ReviewCardModel.countDocuments({ ...scope, reviewType: "mastery_review", nextReviewDate: { $lte: now } }),
    ]);

    return res.json({
      dueToday,
      dueThisWeek,
      totalCards,
      masteryReviewDue,
    });
  }),
);

reviewRouter.get(
  "/mastery-challenges",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = masteryChallengeQuerySchema.parse(req.query);
    const userId = String(req.authUser!.id);
    const progressRows = await SkillProgressModel.find({
      userId,
      pathId: query.pathId,
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      mastery: { $gte: 90 },
      $or: [{ evidenceCount: { $gte: 3 } }, { attempts: { $gte: 3 } }],
    })
      .select("skillId skill pathId subjectId sectionId mastery evidenceCount attempts lastAttemptAt")
      .sort({ lastAttemptAt: 1, mastery: -1 })
      .limit(query.limit)
      .lean();

    const skillIds = progressRows.map((row: any) => String(row.skillId || "")).filter(Boolean);
    const dueCards = skillIds.length
      ? await ReviewCardModel.find({
          userId,
          pathId: query.pathId,
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          skillId: { $in: skillIds },
          reviewType: "mastery_review",
          nextReviewDate: { $lte: new Date() },
        })
          .select("skillId nextReviewDate")
          .lean()
      : [];
    const dueCountBySkill = new Map<string, number>();
    dueCards.forEach((card: any) => {
      const skillId = String(card.skillId || "");
      dueCountBySkill.set(skillId, (dueCountBySkill.get(skillId) || 0) + 1);
    });

    return res.json({
      scope: { pathId: query.pathId, ...(query.subjectId ? { subjectId: query.subjectId } : {}) },
      challenges: progressRows.map((row: any) => ({
        skillId: String(row.skillId || ""),
        skill: String(row.skill || "مهارة"),
        pathId: String(row.pathId || ""),
        subjectId: String(row.subjectId || ""),
        sectionId: String(row.sectionId || ""),
        mastery: Number(row.mastery || 0),
        evidenceCount: Number(row.evidenceCount || row.attempts || 0),
        lastAttemptAt: row.lastAttemptAt,
        dueReviewCount: dueCountBySkill.get(String(row.skillId || "")) || 0,
      })),
    });
  }),
);
