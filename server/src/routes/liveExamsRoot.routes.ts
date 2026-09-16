import type { NextFunction, Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { liveExamStartHandler } from "../modules/quizzes/http/liveExamStartHandler.js";
import legacyLiveExamsRouter from "./live-exams.routes.js";

function forwardToLegacy(req: Request, res: Response, next: NextFunction) {
  return legacyLiveExamsRouter(req, res, next);
}

/**
 * Architecture-preserving adapter: the public `/live-exams` mount remains
 * unchanged, while POST /start moves behind the concurrency-safe canonical
 * attempt/session boundary. All other endpoints retain their verified legacy
 * behavior until their own migration batches.
 */
const liveExamsRouter: RequestHandler = (req, res, next) => {
  if (req.method !== "POST" || req.path !== "/start") {
    return forwardToLegacy(req, res, next);
  }

  void requireAuth(req, res, (authError?: unknown) => {
    if (authError) return next(authError);
    void liveExamStartHandler(req, res);
  });
};

export default liveExamsRouter;
