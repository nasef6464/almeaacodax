import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { UserModel } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const leaderboardQuerySchema = z.object({
  scope: z.enum(["global", "group", "school"]).default("global"),
  period: z.enum(["week", "month", "all"]).default("month"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

type LeaderboardRow = {
  userId: string;
  name: string;
  avatar: string;
  role: string;
  avgScore: number;
  attempts: number;
  bestScore: number;
  completedLessons: number;
  points: number;
  compositeScore: number;
};

const PERIOD_MS: Record<"week" | "month" | "all", number | null> = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: null,
};

export const leaderboardRouter = Router();

leaderboardRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = leaderboardQuerySchema.parse(req.query);
    const authUser = req.authUser!;

    const scoreMatch: Record<string, unknown> = {};
    const periodMs = PERIOD_MS[query.period];
    if (periodMs) {
      scoreMatch.createdAt = { $gte: new Date(Date.now() - periodMs) };
    }

    const baseUsersFilter: Record<string, unknown> = { isActive: { $ne: false } };
    if (query.scope === "group") {
      const userGroupIds = Array.isArray(authUser.groupIds) ? authUser.groupIds.filter(Boolean) : [];
      if (userGroupIds.length === 0) {
        return res.json({ scope: query.scope, period: query.period, top: [], currentUserRank: null, total: 0 });
      }
      baseUsersFilter.groupIds = { $in: userGroupIds };
    }
    if (query.scope === "school") {
      if (!authUser.schoolId) {
        return res.json({ scope: query.scope, period: query.period, top: [], currentUserRank: null, total: 0 });
      }
      baseUsersFilter.schoolId = authUser.schoolId;
    }

    const users = await UserModel.find(baseUsersFilter)
      .select("_id name avatar role points completedLessons")
      .lean();
    const allowedUserIds = users.map((user: any) => String(user._id));
    if (allowedUserIds.length === 0) {
      return res.json({ scope: query.scope, period: query.period, top: [], currentUserRank: null, total: 0 });
    }

    scoreMatch.userId = { $in: allowedUserIds };

    const aggregates = await QuizResultModel.aggregate([
      { $match: scoreMatch },
      {
        $group: {
          _id: "$userId",
          avgScore: { $avg: "$score" },
          attempts: { $sum: 1 },
          bestScore: { $max: "$score" },
        },
      },
    ]);

    const aggregateByUserId = new Map(
      aggregates.map((item: any) => [
        String(item._id),
        {
          avgScore: Number(item.avgScore || 0),
          attempts: Number(item.attempts || 0),
          bestScore: Number(item.bestScore || 0),
        },
      ]),
    );

    const rankedRows: LeaderboardRow[] = users
      .map((user: any) => {
        const userId = String(user._id);
        const aggregate = aggregateByUserId.get(userId);
        const avgScore = Number(aggregate?.avgScore || 0);
        const attempts = Number(aggregate?.attempts || 0);
        const bestScore = Number(aggregate?.bestScore || 0);
        const completedLessons = Array.isArray(user.completedLessons) ? user.completedLessons.length : 0;
        const points = Number(user.points || 0);
        const compositeScore = avgScore * 0.75 + Math.min(completedLessons, 200) * 0.15 + Math.min(points, 10000) * 0.001;

        return {
          userId,
          name: String(user.name || "طالب"),
          avatar: String(user.avatar || ""),
          role: String(user.role || "student"),
          avgScore: Math.round(avgScore),
          attempts,
          bestScore: Math.round(bestScore),
          completedLessons,
          points,
          compositeScore: Number(compositeScore.toFixed(3)),
        };
      })
      .filter((row) => row.attempts > 0 || row.completedLessons > 0 || row.points > 0)
      .sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return b.points - a.points;
      });

    const withRank = rankedRows.map((row, index) => ({ ...row, rank: index + 1 }));
    const top = withRank.slice(0, query.limit);
    const currentUserRank = withRank.find((row) => row.userId === String(authUser.id)) || null;

    return res.json({
      scope: query.scope,
      period: query.period,
      total: withRank.length,
      top,
      currentUserRank,
    });
  }),
);
