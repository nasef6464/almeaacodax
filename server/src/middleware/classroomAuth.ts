import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { hasActiveSchoolRole } from "../modules/schools/application/schoolContextResolver.js";

/**
 * Smart Classroom is a school-scoped product. Legacy User.schoolId/groupIds
 * remain migration compatibility fields, but explicit SchoolMembership state
 * is authoritative once it exists.
 */
export async function requireActiveClassroomSchoolContext(req: Request, res: Response, next: NextFunction) {
  const actor = req.authUser;
  if (!actor) return next();

  try {
    if (actor.role === "student") {
      const schoolId = String(actor.schoolId || "").trim();
      if (!schoolId) return next();
      const allowed = await hasActiveSchoolRole(actor, schoolId, "student");
      if (!allowed) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "School classroom access is inactive",
        });
      }
      return next();
    }

    if (actor.role === "teacher") {
      const sessionMatch = req.path.match(/^\/sessions\/([^/]+)(?:\/|$)/);
      const requestedSessionId = sessionMatch?.[1] || "";
      if (!requestedSessionId || !Types.ObjectId.isValid(requestedSessionId)) return next();

      const session = await ClassroomSessionModel.findById(requestedSessionId).select("schoolId teacherId").lean() as any;
      // Let the downstream route preserve its own not-found/non-owner response.
      // This guard only tightens authorization for the session owner.
      if (!session || String(session.teacherId) !== String(actor.id)) return next();

      const allowed = await hasActiveSchoolRole(actor, String(session.schoolId), "teacher");
      if (!allowed) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Teacher school classroom access is inactive",
        });
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
