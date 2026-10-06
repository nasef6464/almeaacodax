import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { QuestionModel } from "../models/Question.js";
import { QuestionAttemptModel } from "../models/QuestionAttempt.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const analyticsQuerySchema = z.object({
  ids: z.string().min(1).max(12_000),
});

const uniqueStrings = (values: string[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const canonicalQuestionId = (question: Record<string, unknown>) =>
  String(question.id || question._id || "").trim();

export const questionAnalyticsRouter = Router();

questionAnalyticsRouter.get(
  "/",
  requireAuth,
  requireRole(["admin", "teacher"]),
  asyncHandler(async (req, res) => {
    const query = analyticsQuerySchema.parse(req.query);
    const requestedIds = uniqueStrings(query.ids.split(","));

    if (requestedIds.length > 100) {
      return res.status(400).json({ message: "A maximum of 100 question ids is allowed per analytics request." });
    }

    const requestedObjectIds = requestedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const questionQuery = requestedObjectIds.length
      ? { $or: [{ id: { $in: requestedIds } }, { _id: { $in: requestedObjectIds } }] }
      : { id: { $in: requestedIds } };

    const questions = await QuestionModel.find(questionQuery)
      .select("_id id pathId subject")
      .lean();

    const authUser = req.authUser!;
    const managedPathIds = new Set((authUser.managedPathIds || []).map(String));
    const managedSubjectIds = new Set((authUser.managedSubjectIds || []).map(String));

    const visibleQuestions =
      authUser.role === "teacher"
        ? questions.filter((question: any) => {
            const subjectId = String(question.subject || "");
            const pathId = String(question.pathId || "");
            if (managedSubjectIds.size > 0 && !managedSubjectIds.has(subjectId)) return false;
            if (managedPathIds.size > 0 && pathId && !managedPathIds.has(pathId)) return false;
            return true;
          })
        : questions;

    const aliasesByCanonicalId = new Map<string, string[]>();
    const canonicalIdByAlias = new Map<string, string>();

    for (const question of visibleQuestions as Array<Record<string, unknown>>) {
      const canonicalId = canonicalQuestionId(question);
      if (!canonicalId) continue;
      const aliases = uniqueStrings([canonicalId, String(question._id || ""), String(question.id || "")]);
      aliasesByCanonicalId.set(canonicalId, aliases);
      aliases.forEach((alias) => canonicalIdByAlias.set(alias, canonicalId));
    }

    const attemptQuestionIds = [...canonicalIdByAlias.keys()];
    if (attemptQuestionIds.length === 0) {
      return res.json({ data: [] });
    }

    const rawMetrics = await QuestionAttemptModel.aggregate<{
      _id: string;
      attempts: number;
      correctAnswers: number;
      totalTimeSeconds: number;
      studentIds: string[];
      lastAttemptAt: Date | null;
    }>([
      { $match: { questionId: { $in: attemptQuestionIds } } },
      {
        $group: {
          _id: "$questionId",
          attempts: { $sum: 1 },
          correctAnswers: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          totalTimeSeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } },
          studentIds: { $addToSet: "$userId" },
          lastAttemptAt: { $max: "$createdAt" },
        },
      },
    ]);

    const metricsByCanonicalId = new Map<
      string,
      {
        attempts: number;
        correctAnswers: number;
        totalTimeSeconds: number;
        studentIds: Set<string>;
        lastAttemptAt: Date | null;
      }
    >();

    for (const metric of rawMetrics) {
      const canonicalId = canonicalIdByAlias.get(String(metric._id || ""));
      if (!canonicalId) continue;
      const current = metricsByCanonicalId.get(canonicalId) || {
        attempts: 0,
        correctAnswers: 0,
        totalTimeSeconds: 0,
        studentIds: new Set<string>(),
        lastAttemptAt: null,
      };
      current.attempts += Number(metric.attempts || 0);
      current.correctAnswers += Number(metric.correctAnswers || 0);
      current.totalTimeSeconds += Number(metric.totalTimeSeconds || 0);
      (metric.studentIds || []).forEach((studentId) => current.studentIds.add(String(studentId)));
      const lastAttemptAt = metric.lastAttemptAt ? new Date(metric.lastAttemptAt) : null;
      if (lastAttemptAt && (!current.lastAttemptAt || lastAttemptAt > current.lastAttemptAt)) {
        current.lastAttemptAt = lastAttemptAt;
      }
      metricsByCanonicalId.set(canonicalId, current);
    }

    const data = [...aliasesByCanonicalId.entries()].map(([questionId, aliases]) => {
      const metric = metricsByCanonicalId.get(questionId);
      const attempts = metric?.attempts || 0;
      const correctAnswers = metric?.correctAnswers || 0;
      return {
        questionId,
        aliases,
        attempts,
        correctAnswers,
        accuracyPercent: attempts > 0 ? Math.round((correctAnswers / attempts) * 1000) / 10 : null,
        averageTimeSeconds: attempts > 0 ? Math.round(((metric?.totalTimeSeconds || 0) / attempts) * 10) / 10 : null,
        uniqueStudents: metric?.studentIds.size || 0,
        lastAttemptAt: metric?.lastAttemptAt || null,
      };
    });

    return res.json({ data });
  }),
);
