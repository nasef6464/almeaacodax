import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { ClassroomTemplateModel } from "../models/ClassroomTemplate.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";
import { hasActiveSchoolRole } from "../modules/schools/application/schoolContextResolver.js";

const smartClassroomEnabled = async (schoolId: string) => {
  const entitlement = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
  return entitlement.allowed;
};

const rejectDisabledModule = (res: Response) => res.status(StatusCodes.FORBIDDEN).json({
  message: "Smart Classroom is not enabled for this school",
});

/**
 * Smart Classroom is a school-scoped product. Legacy User.schoolId/groupIds
 * remain migration compatibility fields, but explicit SchoolMembership state
 * is authoritative once it exists. Operational access also requires the
 * SMART_CLASSROOM module to be currently enabled on the school's contract.
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
      if (!(await smartClassroomEnabled(schoolId))) return rejectDisabledModule(res);
      return next();
    }

    if (actor.role === "teacher") {
      // School-scoped teacher entry points that do not identify an existing
      // session still need the commercial entitlement enforced at the API edge.
      if (req.path === "/questions" || req.path === "/templates" || req.path === "/sessions") {
        const requestedSchoolId = typeof req.query.schoolId === "string" && req.query.schoolId.trim()
          ? req.query.schoolId.trim()
          : typeof req.body?.schoolId === "string"
            ? req.body.schoolId.trim()
            : "";
        if (requestedSchoolId && !(await smartClassroomEnabled(requestedSchoolId))) return rejectDisabledModule(res);
      }

      // Teacher history must always be explicitly scoped to one active school.
      // Without this guard an old teacher JWT could ask for history without a
      // schoolId and the downstream route would filter by teacherId only,
      // exposing sessions from a school whose membership was later revoked.
      if (req.path === "/teacher/history") {
        const requestedSchoolId = typeof req.query.schoolId === "string" ? req.query.schoolId.trim() : "";
        if (!requestedSchoolId) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: "schoolId is required for teacher classroom history",
          });
        }
        const allowed = await hasActiveSchoolRole(actor, requestedSchoolId, "teacher");
        if (!allowed) {
          return res.status(StatusCodes.FORBIDDEN).json({
            message: "Teacher school classroom access is inactive",
          });
        }
        if (!(await smartClassroomEnabled(requestedSchoolId))) return rejectDisabledModule(res);
        return next();
      }

      // Template deletion is ownership-scoped downstream, but ownership alone
      // must not let a teacher mutate school data after that school membership
      // or Smart Classroom entitlement has been revoked.
      const templateDeleteMatch = req.path.match(/^\/templates\/([^/]+)\/delete$/);
      const requestedTemplateId = templateDeleteMatch?.[1] || "";
      if (requestedTemplateId && Types.ObjectId.isValid(requestedTemplateId)) {
        const template = await ClassroomTemplateModel.findById(requestedTemplateId).select("schoolId teacherId").lean() as any;
        if (template && String(template.teacherId) === String(actor.id)) {
          const allowed = await hasActiveSchoolRole(actor, String(template.schoolId), "teacher");
          if (!allowed) {
            return res.status(StatusCodes.FORBIDDEN).json({
              message: "Teacher school classroom access is inactive",
            });
          }
          if (!(await smartClassroomEnabled(String(template.schoolId)))) return rejectDisabledModule(res);
        }
        return next();
      }

      const sessionMatch = req.path.match(/^\/sessions\/([^/]+)(?:\/|$)/);
      const requestedSessionId = sessionMatch?.[1] || "";
      if (!requestedSessionId || !Types.ObjectId.isValid(requestedSessionId)) return next();

      const session = await ClassroomSessionModel.findById(requestedSessionId).select("schoolId classId teacherId").lean() as any;
      // Let the downstream route preserve its own not-found/non-owner response.
      // This guard only tightens authorization for the session owner.
      if (!session || String(session.teacherId) !== String(actor.id)) return next();

      const allowed = await hasActiveSchoolRole(actor, String(session.schoolId), "teacher");
      if (!allowed) {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Teacher school classroom access is inactive",
        });
      }

      // Removing a teacher from a class must revoke operational control over an
      // already-owned session. Keep /end available so the owner can still cleanly
      // finalize a live session instead of leaving the class locked by a stale live row.
      if (!req.path.endsWith("/end")) {
        const assignment = await TeachingAssignmentModel.exists({
          schoolId: String(session.schoolId),
          classId: String(session.classId),
          teacherId: String(actor.id),
          status: "active",
        });
        if (!assignment) {
          return res.status(StatusCodes.FORBIDDEN).json({
            message: "Teacher classroom assignment is inactive",
          });
        }
      }

      // Even after commercial access is disabled, the owner may end the live
      // session so cleanup/report finalization is never blocked.
      if (!req.path.endsWith("/end") && !(await smartClassroomEnabled(String(session.schoolId)))) {
        return rejectDisabledModule(res);
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
