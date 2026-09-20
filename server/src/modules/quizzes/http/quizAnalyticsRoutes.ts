import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { buildQuizAnalyticsOverview } from "../application/quizAnalyticsOverview.js";
import { dashboardAnalyticsQuerySchema } from "./questionQuerySchemas.js";

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
