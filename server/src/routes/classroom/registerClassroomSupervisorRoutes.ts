import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { GroupModel } from "../../models/Group.js";
import { PathModel } from "../../models/Path.js";
import { SchoolInterventionModel } from "../../models/SchoolIntervention.js";
import { StudyPlanModel } from "../../models/StudyPlan.js";
import { UserModel } from "../../models/User.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import {
  buildClassroomSessionReport,
  buildClassroomTeacherReports,
  classroomScopeFilter,
  resolveClassroomSupervisorScope,
} from "../../modules/schools/application/classroomSupervisorReport.js";
import {
  buildClassroomSchoolIntelligence,
  buildClassroomSkillEvidence,
} from "../../modules/schools/application/classroomSchoolIntelligence.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const interventionSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().optional().default(""),
  skillId: z.string().min(1),
  targetStudentIds: z.array(z.string().min(1)).min(1).max(50),
  pathId: z.string().min(1),
  dailyMinutes: z.number().int().min(15).max(240).optional().default(90),
  followUpAt: z.string().datetime().optional(),
  remediationThreshold: z.number().min(0).max(100).optional(),
  minimumEvidence: z.number().int().min(1).max(500).optional(),
});

const idQuery = (ids: string[]) => ({
  $or: [
    { id: { $in: ids } },
    ...(ids.filter((id) => Types.ObjectId.isValid(id)).length
      ? [{ _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) } }]
      : []),
  ],
});

export function registerClassroomSupervisorRoutes(classroomRouter: Router) {
  classroomRouter.get("/teacher/history", requireAuth, requireRole(["teacher", "school_admin", "admin"]), asyncHandler(async (req, res) => {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId.trim() : "";
    const filter: Record<string, any> = {};
    if (req.authUser!.role === "teacher") filter.teacherId = req.authUser!.id;
    if (schoolId) filter.schoolId = schoolId;
    else if (req.authUser!.schoolId) filter.schoolId = req.authUser!.schoolId;

    const limit = z.coerce.number().int().min(1).max(100).catch(50).parse(req.query.limit);
    const sessions = await ClassroomSessionModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ sessions: await Promise.all(sessions.map(buildClassroomSessionReport)) });
  }));

  classroomRouter.get("/supervisor/today", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const sessions = await ClassroomSessionModel.find({
      $and: [classroomScopeFilter(scope), { createdAt: { $gte: start } }],
    }).sort({ createdAt: -1 }).lean();
    res.json({ sessions: await Promise.all(sessions.map(buildClassroomSessionReport)) });
  }));

  classroomRouter.get("/supervisor/history", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const limit = z.coerce.number().int().min(1).max(100).catch(30).parse(req.query.limit);
    const sessions = await ClassroomSessionModel.find(classroomScopeFilter(scope)).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ sessions: await Promise.all(sessions.map(buildClassroomSessionReport)) });
  }));

  classroomRouter.get("/supervisor/teachers", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    res.json({ teachers: await buildClassroomTeacherReports(scope) });
  }));

  classroomRouter.get("/supervisor/intelligence", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    res.json({ intelligence: await buildClassroomSchoolIntelligence(scope) });
  }));

  classroomRouter.get("/supervisor/interventions", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const interventions = await SchoolInterventionModel.find(classroomScopeFilter(scope)).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ interventions });
  }));

  classroomRouter.post("/supervisor/interventions", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const payload = interventionSchema.parse(req.body);
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const permitted = scope.all
      || scope.schoolIds.includes(payload.schoolId)
      || (!!payload.classId && scope.classIds.includes(payload.classId));
    if (!permitted) return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention scope denied" });

    const entitlement = await resolveSchoolEntitlement(payload.schoolId, "INTERVENTION_CENTER");
    if (!entitlement.allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention Center is not enabled for this school" });
    }

    if (payload.classId) {
      const classroom = await GroupModel.findOne({ _id: payload.classId, type: "CLASS", parentId: payload.schoolId }).lean();
      if (!classroom) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Class does not belong to this school" });
    }

    const [students, path] = await Promise.all([
      UserModel.find({ role: "student", ...idQuery(payload.targetStudentIds) }).select("_id id name schoolId groupIds").lean(),
      PathModel.findOne(idQuery([payload.pathId])).select("_id id name").lean(),
    ]);
    if (!path || students.length !== payload.targetStudentIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Path or target students not found" });
    }

    const targetIds = students.map((student: any) => String(student.id || student._id));
    const targetsInScope = students.every((student: any) => {
      const groups = (student.groupIds || []).map(String);
      if (payload.classId) {
        return groups.includes(payload.classId)
          && (scope.all || scope.schoolIds.includes(payload.schoolId) || scope.classIds.includes(payload.classId));
      }
      return String(student.schoolId || "") === payload.schoolId
        && (scope.all || scope.schoolIds.includes(payload.schoolId));
    });
    if (!targetsInScope) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention target is outside your school/class scope" });
    }

    const baseline = await buildClassroomSkillEvidence({
      schoolId: payload.schoolId,
      classId: payload.classId || undefined,
      skillId: payload.skillId,
      studentIds: targetIds,
    });
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 13);
    const dateKey = (date: Date) => date.toISOString().slice(0, 10);

    const studyPlans = await Promise.all(students.map(async (student: any) => {
      const studentId = String(student.id || student._id);
      return StudyPlanModel.create({
        id: `school_intervention_${studentId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: studentId,
        name: `خطة علاج مهارة ${payload.skillId}`,
        pathId: String((path as any).id || (path as any)._id),
        subjectIds: [],
        courseIds: [],
        startDate: dateKey(now),
        endDate: dateKey(end),
        skipCompletedQuizzes: true,
        offDays: [],
        dailyMinutes: payload.dailyMinutes,
        preferredStartTime: "17:00",
        status: "active",
      });
    }));

    const intervention = await SchoolInterventionModel.create({
      schoolId: payload.schoolId,
      classId: payload.classId,
      skillId: payload.skillId,
      targetStudentIds: targetIds,
      actionType: "study_plan",
      actionRef: String((path as any).id || (path as any)._id),
      assignedBy: req.authUser!.id,
      followUpAt: payload.followUpAt ? new Date(payload.followUpAt) : null,
      remediationThreshold: payload.remediationThreshold,
      minimumEvidence: payload.minimumEvidence,
      baseline,
    });
    res.status(StatusCodes.CREATED).json({ intervention, studyPlanIds: studyPlans.map((plan: any) => plan.id) });
  }));

  classroomRouter.get("/supervisor/interventions/:id/outcome", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const intervention = await SchoolInterventionModel.findOne({
      $and: [{ _id: req.params.id }, classroomScopeFilter(scope)],
    }).lean() as any;
    if (!intervention) return res.status(StatusCodes.NOT_FOUND).json({ message: "Intervention not found" });

    const outcome = await buildClassroomSkillEvidence({
      schoolId: intervention.schoolId,
      classId: intervention.classId || undefined,
      skillId: intervention.skillId,
      studentIds: intervention.targetStudentIds,
      from: intervention.createdAt,
    });
    const minimumEvidence = intervention.minimumEvidence ?? null;
    const enoughEvidence = minimumEvidence === null
      || (intervention.baseline.evidenceCount >= minimumEvidence && outcome.evidenceCount >= minimumEvidence);
    const delta = intervention.baseline.accuracy === null || outcome.accuracy === null
      ? null
      : outcome.accuracy - intervention.baseline.accuracy;
    res.json({ intervention, outcome, comparison: { delta, minimumEvidence, confidence: enoughEvidence ? "measured" : "insufficient_evidence" } });
  }));

  classroomRouter.get("/supervisor/sessions/:id/report", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    const session = await ClassroomSessionModel.findOne({
      $and: [{ _id: req.params.id }, classroomScopeFilter(scope)],
    }).lean();
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session report not found" });
    res.json({ report: await buildClassroomSessionReport(session) });
  }));
}
