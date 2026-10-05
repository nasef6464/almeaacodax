import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { GroupModel } from "../../models/Group.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { UserModel } from "../../models/User.js";
import { Types } from "mongoose";
import { buildClassroomReportInsights, buildClassroomSupervisorDrilldown, type ClassroomInsightsPeriod } from "../../modules/schools/application/classroomReportInsights.js";
import { buildClassroomSessionReport, classroomScopeFilter, resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

const periodSchema = z.enum(["today", "week", "month", "all"]);
const supervisorPeriodSchema = z.enum(["today", "week", "month", "all", "custom"]);

const periodRange = (period: z.infer<typeof supervisorPeriodSchema>, from?: string, to?: string) => {
  const now = new Date();
  if (period === "all") return { from: null as Date | null, to: null as Date | null };
  if (period === "custom") {
    if (!from || !to) return { error: "from and to are required for custom period" as const };
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
      return { error: "Invalid custom date range" as const };
    }
    return { from: start, to: end };
  }
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (period === "week" ? 6 : 29));
  }
  return { from: start, to: now };
};

const idQuery = (ids: string[]) => {
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id));
  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};


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
  classroomRouter.get(
    "/supervisor/insights",
    requireAuth,
    requireRole(["admin", "supervisor"]),
    asyncHandler(async (req, res) => {
      const scope = await resolveClassroomSupervisorScope(req.authUser!);
      const period = supervisorPeriodSchema.catch("month").parse(req.query.period);
      const from = typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : undefined;
      const to = typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : undefined;
      const range = periodRange(period, from, to);
      if ("error" in range) return res.status(StatusCodes.BAD_REQUEST).json({ message: range.error });

      const schoolId = typeof req.query.schoolId === "string" && req.query.schoolId.trim() ? req.query.schoolId.trim() : undefined;
      const teacherId = typeof req.query.teacherId === "string" && req.query.teacherId.trim() ? req.query.teacherId.trim() : undefined;
      const classId = typeof req.query.classId === "string" && req.query.classId.trim() ? req.query.classId.trim() : undefined;
      const weakThreshold = z.coerce.number().min(1).max(99).catch(65).parse(req.query.weakThreshold);
      const limit = z.coerce.number().int().min(1).max(1000).catch(500).parse(req.query.limit);

      const filters: Record<string, unknown>[] = [
        classroomScopeFilter(scope),
        { status: { $in: ["ended", "archived"] } },
      ];
      if (schoolId) filters.push({ schoolId });
      if (teacherId) filters.push({ teacherId });
      if (classId) filters.push({ classId });
      if (range.from) {
        const endedAt: Record<string, Date> = { $gte: range.from };
        if (range.to) endedAt.$lte = range.to;
        filters.push({ endedAt });
      }

      const sessions = await ClassroomSessionModel.find({ $and: filters })
        .select("schoolId classId className subjectName teacherId status endedAt reportSnapshot questionSnapshots createdAt startedAt")
        .sort({ endedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      const reports = await Promise.all(sessions.map(buildClassroomSessionReport));
      const schoolIds = Array.from(new Set(reports.map((report) => String(report.schoolId || "")).filter(Boolean)));
      const teacherIds = Array.from(new Set(reports.map((report) => String(report.teacherId || "")).filter(Boolean)));

      const [schoolGroups, teachers] = await Promise.all([
        schoolIds.length ? GroupModel.find(idQuery(schoolIds)).select("id _id name").lean() : [],
        teacherIds.length ? UserModel.find(idQuery(teacherIds)).select("id _id name displayName").lean() : [],
      ]);

      const schoolNames: Record<string, string> = {};
      for (const school of schoolGroups as any[]) {
        const name = String(school.name || "مدرسة");
        if (school.id) schoolNames[String(school.id)] = name;
        if (school._id) schoolNames[String(school._id)] = name;
      }

      const teacherNames: Record<string, string> = {};
      for (const teacher of teachers as any[]) {
        const name = String(teacher.displayName || teacher.name || "معلم");
        if (teacher.id) teacherNames[String(teacher.id)] = name;
        if (teacher._id) teacherNames[String(teacher._id)] = name;
      }

      const insights = buildClassroomReportInsights(reports, {
        period: "all",
        weakThreshold,
      });
      const hierarchy = buildClassroomSupervisorDrilldown(reports, { schoolNames, teacherNames });

      res.json({
        analytics: {
          ...insights,
          period,
          range: {
            from: range.from?.toISOString() || null,
            to: range.to?.toISOString() || null,
          },
          filters: {
            schoolId: schoolId || null,
            teacherId: teacherId || null,
            classId: classId || null,
          },
          hierarchy,
        },
      });
    }),
  );

}
