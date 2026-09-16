import type { NextFunction, Request, RequestHandler, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireCanonicalNotificationAudience } from "../modules/notifications/http/notificationAudienceAuthority.js";
import { notificationRouter as legacyNotificationRouter } from "./notification.routes.js";

const guardedAudiencePaths = new Set(["/intervention-alert", "/student-alert"]);

function forwardToLegacy(req: Request, res: Response, next: NextFunction) {
  return legacyNotificationRouter(req, res, next);
}

/**
 * Security adapter that preserves the canonical /notifications mount while
 * forcing the two staff-to-student audience mutations through canonical school
 * membership/teaching-assignment authority first. The legacy router remains the
 * compatibility implementation for delivery and non-migrated class supervisors.
 */
export const notificationRouter: RequestHandler = (req, res, next) => {
  if (req.method !== "POST" || !guardedAudiencePaths.has(req.path)) {
    return forwardToLegacy(req, res, next);
  }

  void requireAuth(req, res, (authError?: unknown) => {
    if (authError) return next(authError);
    void requireCanonicalNotificationAudience(req, res, (authorityError?: unknown) => {
      if (authorityError) return next(authorityError);
      return forwardToLegacy(req, res, next);
    });
  });
};
