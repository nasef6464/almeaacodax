import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { buildClassroomReportInsights, type ClassroomInsightsPeriod } from "../../modules/schools/application/classroomReportInsights.js";
import { buildClassroomSessionReport } from "../../modules/schools/application/classroomSupervisorReport.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

const periodSchema = z.enum(["today", "week", "month", "all"]);

export function registerClassroomInsightsRoutes(classroomRouter: Router) {
  classroomRouter.get(
    "/teacher/insights",
    requireAuth,
    requireRole(["teacher", "school_admin", "admin"]),
    asyncHandler(async (req, res) => {
      const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId.trim() : "";
      if (!schoolId) return res.status(StatusCodes.BAD_REQUEST).json({ message: "schoolId is required" });

      if (req.authUser!.role !== "admin") {
        const entitlement = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
        if (!entitlement.allowed) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
      }

      const classId = typeof req.query.classId === "string" && req.query.classId.trim() ? req.query.classId.trim() : undefined;

      if (req.authUser!.role === "teacher") {
        if (!(await ensureTeacherSchoolAccess(req.authUser!, schoolId))) {
          return res.status(StatusCodes.FORBIDDEN).json({ message: "School insights access denied" });
        }
        if (classId) {
          const assigned = await TeachingAssignmentModel.exists({
            schoolId,
            classId,
            teacherId: req.authUser!.id,
            status: "active",
          });
          if (!assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Class insights access denied" });
        }
      } else if (req.authUser!.role === "school_admin") {
        const capability = await requireSchoolDirectorCapability(
          req.authUser!.id,
          schoolId,
          "SCHOOL_SMART_CLASSROOM_VIEW",
          "SMART_CLASSROOM",
        );
        if (!capability) return res.status(StatusCodes.FORBIDDEN).json({ message: "School insights access denied" });
      }

      const period = periodSchema.catch("week").parse(req.query.period) as ClassroomInsightsPeriod;
      const weakThreshold = z.coerce.number().min(1).max(99).catch(65).parse(req.query.weakThreshold);
      const limit = z.coerce.number().int().min(1).max(100).catch(100).parse(req.query.limit);

      const filter: Record<string, unknown> = {
        schoolId,
        status: { $in: ["ended", "archived"] },
      };
      if (req.authUser!.role === "teacher") filter.teacherId = req.authUser!.id;
      if (classId) filter.classId = classId;

      const sessions = await ClassroomSessionModel.find(filter)
        .select("schoolId classId className teacherId status endedAt reportSnapshot questionSnapshots createdAt startedAt")
        .sort({ endedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      const reports = await Promise.all(sessions.map(buildClassroomSessionReport));
      res.json({
        insights: buildClassroomReportInsights(reports, {
          period,
          classId,
          weakThreshold,
        }),
      });
    }),
  );
}
