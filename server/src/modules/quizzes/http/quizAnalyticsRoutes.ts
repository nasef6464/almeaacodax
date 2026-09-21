import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildQuizAnalyticsOverview } from "../application/quizAnalyticsOverview.js";
import { buildSchoolSkillAggregateView } from "../application/schoolSkillAggregateView.js";
import { dashboardAnalyticsQuerySchema } from "./questionQuerySchemas.js";
import { schoolSkillAggregateQuerySchema } from "./schoolSkillAggregateSchemas.js";

export const quizAnalyticsRouter = Router();

quizAnalyticsRouter.get(
  "/analytics/overview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = dashboardAnalyticsQuerySchema.parse(req.query);
    const payload = await buildQuizAnalyticsOverview(String(req.authUser!.id || ""), query);
    if (!payload) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }
    return res.json(payload);
  }),
);


quizAnalyticsRouter.get(
  "/analytics/school-skills",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = schoolSkillAggregateQuerySchema.parse(req.query);
    const payload = await buildSchoolSkillAggregateView(String(req.authUser!.id || ""), query);
    if (payload.status === "not_found") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }
    if (payload.status === "forbidden") {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "School skill analytics are staff-only" });
    }
    return res.json(payload);
  }),
);
