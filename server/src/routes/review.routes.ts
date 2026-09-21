import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PathModel } from "../models/Path.js";
import { QuestionAttemptModel } from "../models/QuestionAttempt.js";
import { QuestionModel } from "../models/Question.js";
import { ReviewCardModel } from "../models/ReviewCard.js";
import { SkillProgressModel } from "../models/SkillProgress.js";
import { SubjectModel } from "../models/Subject.js";
import { updateSkillProgressFromQuestionAttempt } from "../modules/quizzes/application/quizSubmissionSideEffects.js";
import { sm2 } from "../services/spacedRepetition.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const answerSchema = z
  .object({
    quality: z.number().min(0).max(5).optional(),
    selectedOptionIndex: z.number().int().min(-1).optional(),
    eventId: z.string().trim().min(8).max(160).optional(),
  })
  .refine(
    (value) => value.quality !== undefined || value.selectedOptionIndex !== undefined,
    "quality or selectedOptionIndex is required",
  );

const dueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  pathId: z.string().trim().optional().default(""),
  subjectId: z.string().trim().optional().default(""),
});

const masteryChallengeQuerySchema = z.object({
  pathId: z.string().trim().min(1),
  subjectId: z.string().trim().optional().default(""),
  limit: z.coerce.number().int().min(1).max(20).default(5),
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

const validateRequiredReviewScope = async (pathId: string, subjectId?: string) => {
  const pathExists = await PathModel.exists({ _id: pathId });
  if (!pathExists) return { ok: false as const, message: "Learning path not found" };
  if (subjectId) {
    const subjectExists = await SubjectModel.exists({ _id: subjectId, pathId });
    if (!subjectExists) {
      return { ok: false as const, message: "Subject does not belong to the selected path" };
    }
  }
  return { ok: true as const };
};

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
      ? await QuestionModel.find(buildQuestionBatchQuery(questionIds))
          .select("id text options imageUrl type skillIds")
          .lean()
      : [];
    const questionById = new Map<string, any>();
    questions.forEach((question: any) => {
      const canonical = String(question.id || question._id || "");
      const mongoId = String(question._id || "");
      if (canonical) questionById.set(canonical, question);
      if (mongoId) questionById.set(mongoId, question);
    });

    const items = cards
      .map((card: any) => {
        const question = questionById.get(String(card.questionId || ""));
        if (!question) return null;
        return {
          cardId: String(card.id || card._id),
          questionId: String(card.questionId || ""),
          skillId: String(card.skillId || ""),
          skillIds: Array.isArray(card.skillIds) ? card.skillIds.map(String) : [],
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

    const eventId = String(payload.eventId || "").trim();
    if (eventId && String(card.lastReviewEventId || "") === eventId) {
      return res.json({
        success: true,
        idempotent: true,
        card: {
          id: String(card.id || card._id),
          nextReviewDate: card.nextReviewDate,
          interval: card.interval,
          repetitions: card.repetitions,
          easeFactor: card.easeFactor,
          lastQuality: card.lastQuality,
        },
      });
    }

    let selectedOptionIndex: number | undefined;
    let isCorrect: boolean | undefined;
    let question: any = null;
    let quality = payload.quality;

    if (payload.selectedOptionIndex !== undefined) {
      selectedOptionIndex = Number(payload.selectedOptionIndex);
      const questionId = String(card.questionId || "");
      question = await QuestionModel.findOne(buildQuestionBatchQuery([questionId]))
        .select("id correctOptionIndex pathId subject subjectId sectionId skillIds")
        .lean();
      if (!question) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Review question not found" });
      }
      isCorrect = selectedOptionIndex >= 0 && selectedOptionIndex === Number(question.correctOptionIndex ?? 0);
      quality = isCorrect ? 4 : 2;
    }

    const next = sm2(
      {
        easeFactor: Number(card.easeFactor || 2.5),
        interval: Number(card.interval || 1),
        repetitions: Number(card.repetitions || 0),
      },
      Number(quality ?? 0),
    );

    const updated = await ReviewCardModel.findOneAndUpdate(
      {
        _id: card._id,
        userId,
        ...(eventId ? { lastReviewEventId: { $ne: eventId } } : {}),
      },
      {
        $set: {
          easeFactor: next.easeFactor,
          interval: next.interval,
          repetitions: next.repetitions,
          nextReviewDate: next.nextReviewDate,
          lastQuality: Number(quality ?? 0),
          ...(eventId ? { lastReviewEventId: eventId } : {}),
          lastReviewedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!updated && eventId) {
      const latest = await ReviewCardModel.findOne({ _id: card._id, userId }).lean();
      return res.json({
        success: true,
        idempotent: true,
        card: {
          id: String(latest?._id || card._id),
          nextReviewDate: latest?.nextReviewDate || card.nextReviewDate,
          interval: latest?.interval ?? card.interval,
          repetitions: latest?.repetitions ?? card.repetitions,
          easeFactor: latest?.easeFactor ?? card.easeFactor,
          lastQuality: latest?.lastQuality ?? card.lastQuality,
        },
      });
    }

    if (updated && question && selectedOptionIndex !== undefined && isCorrect !== undefined) {
      try {
        const attempt = await QuestionAttemptModel.create({
          userId,
          questionId: String(card.questionId || ""),
          selectedOptionIndex,
          isCorrect,
          timeSpentSeconds: 0,
          date: new Date().toISOString(),
          pathId: String(card.pathId || question.pathId || ""),
          subjectId: String(card.subjectId || question.subjectId || question.subject || ""),
          sectionId: String(card.sectionId || question.sectionId || ""),
          skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
          evidenceType: "mastery_review",
        });
        await updateSkillProgressFromQuestionAttempt(attempt, userId);
      } catch (error) {
        console.warn("[review] mastery evidence side effect failed", {
          userId,
          cardId: String(card.id || card._id),
          reason: error instanceof Error ? error.message : String(error || "unknown"),
        });
      }
    }

    const saved = updated || card;
    return res.json({
      success: true,
      idempotent: false,
      isCorrect,
      card: {
        id: String(saved.id || saved._id),
        nextReviewDate: saved.nextReviewDate,
        interval: saved.interval,
        repetitions: saved.repetitions,
        easeFactor: saved.easeFactor,
        lastQuality: saved.lastQuality,
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
    const taxonomyScope = await validateRequiredReviewScope(query.pathId, query.subjectId);
    if (!taxonomyScope.ok) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: taxonomyScope.message });
    }

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
          $or: [{ skillId: { $in: skillIds } }, { skillIds: { $in: skillIds } }],
          reviewType: "mastery_review",
          nextReviewDate: { $lte: new Date() },
        })
          .select("skillId skillIds nextReviewDate")
          .limit(100)
          .lean()
      : [];

    const dueCountBySkill = new Map<string, number>();
    dueCards.forEach((card: any) => {
      const linkedSkills = [
        String(card.skillId || ""),
        ...(Array.isArray(card.skillIds) ? card.skillIds.map(String) : []),
      ].filter(Boolean);
      [...new Set(linkedSkills)].forEach((skillId) => {
        dueCountBySkill.set(skillId, (dueCountBySkill.get(skillId) || 0) + 1);
      });
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
