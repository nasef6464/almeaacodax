import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { hasActiveSchoolRole } from "../modules/schools/application/schoolContextResolver.js";

/**
 * Smart Classroom is a school-scoped product. Student accounts may still carry
 * legacy User.schoolId/groupIds for migration compatibility, but an explicit
 * SchoolMembership is authoritative once it exists. This guard keeps legacy
 * users working while ensuring an inactive explicit student membership revokes
 * classroom HTTP access immediately.
 */
export async function requireActiveClassroomSchoolContext(req: Request, res: Response, next: NextFunction) {
  const actor = req.authUser;
  if (!actor || actor.role !== "student") return next();

  const schoolId = String(actor.schoolId || "").trim();
  if (!schoolId) return next();

  try {
    const allowed = await hasActiveSchoolRole(actor, schoolId, "student");
    if (!allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "School classroom access is inactive",
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
