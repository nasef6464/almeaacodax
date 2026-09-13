import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { UserModel } from "../../models/User.js";
import { buildClassroomCompetitionStandings } from "../../modules/schools/application/classroomCompetitionScoring.js";
import { resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { resolveSchoolContexts } from "../../modules/schools/application/schoolContextResolver.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { emitClassroomEvent } from "../../sockets/classroomEvents.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

const competitionConfigSchema = z.object({
  challengeQuestionIds: z.array(z.string().min(1)).max(30).optional().default([]),
  durationSeconds: z.number().int().min(10).max(600),
  competitionEnabled: z.boolean().optional().default(true),
});

const staffCanViewCompetition = async (actor: any, session: any) => {
  if (actor.role === "admin") return true;

  if (actor.role === "teacher" && String(session.teacherId) === String(actor.id)) {
    const [hasSchoolAccess, assignment] = await Promise.all([
      ensureTeacherSchoolAccess(actor, String(session.schoolId)),
      TeachingAssignmentModel.exists({
        schoolId: String(session.schoolId),
        classId: String(session.classId),
        teacherId: String(actor.id),
        status: "active",
      }),
    ]);
    return Boolean(hasSchoolAccess && assignment);
  }

  if (actor.role === "supervisor") {
    const scope = await resolveClassroomSupervisorScope(actor);
    return scope.all || scope.schoolIds.includes(String(session.schoolId)) || scope.classIds.includes(String(session.classId));
  }

  if (actor.role === "school_admin") {
    return Boolean(await requireSchoolDirectorCapability(
      actor.id,
      String(session.schoolId),
      "SCHOOL_SMART_CLASSROOM_VIEW",
      "SMART_CLASSROOM",
    ));
  }

  return false;
};

const teacherCanManageCompetition = async (actor: any, session: any) => {
  if (actor.role === "admin") return true;
  if (actor.role !== "teacher" || String(session.teacherId) !== String(actor.id)) return false;
  const [hasSchoolAccess, assignment] = await Promise.all([
    ensureTeacherSchoolAccess(actor, String(session.schoolId)),
    TeachingAssignmentModel.exists({
      schoolId: String(session.schoolId),
      classId: String(session.classId),
      teacherId: String(actor.id),
      status: "active",
    }),
  ]);
  return Boolean(hasSchoolAccess && assignment);
};

const activeBatch = (session: any) => {
  if (!session.activeBatchId || !Array.isArray(session.questionBatches)) return null;
  return session.questionBatches.find((entry: any) => String(entry.batchId) === String(session.activeBatchId)) || null;
};

const activeCompetitionQuestionIds = (session: any) => {
  const batch = activeBatch(session);
  if (batch?.questionIds?.length) return batch.questionIds.map(String);
  if (Array.isArray(session.publishedQuestionIds) && session.publishedQuestionIds.length > 0) {
    return session.publishedQuestionIds.map(String);
  }
  if (typeof session.activeQuestionIndex === "number" && session.questionSnapshots?.[session.activeQuestionIndex]) {
    return [String(session.questionSnapshots[session.activeQuestionIndex].questionId)];
  }
  return [];
};

const studentCanReadChallengeState = async (actor: any, session: any) => {
  if (actor.role !== "student") return false;
  const student = await UserModel.findById(actor.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student") return false;
  const contexts = await resolveSchoolContexts({ id: actor.id, role: "student", schoolId: student.schoolId || null });
  const hasSchoolContext = contexts.some((context) => context.role === "student" && String(context.schoolId) === String(session.schoolId));
  if (!hasSchoolContext || !(student.groupIds || []).map(String).includes(String(session.classId))) return false;
  return Boolean(await ClassroomParticipantModel.exists({ sessionId: classroomSessionId(session), studentId: actor.id }));
};

const challengeState = (session: any) => {
  const batch = activeBatch(session);
  const now = new Date();
  const timerEndsAt = batch?.timerEndsAt || null;
  return {
    sessionId: classroomSessionId(session),
    activeBatchId: session.activeBatchId || "",
    challengeQuestionIds: (batch?.challengeQuestionIds || []).map(String),
    competitionEnabled: Boolean(batch?.competitionEnabled),
    challengeDurationSeconds: batch?.challengeDurationSeconds ?? null,
    timerStartedAt: batch?.timerStartedAt || null,
    timerEndsAt,
    expired: Boolean(timerEndsAt && new Date(timerEndsAt).getTime() <= now.getTime()),
    serverNow: now,
  };
};

export function registerClassroomCompetitionRoutes(classroomRouter: Router) {
  classroomRouter.get("/sessions/:id/challenge-state", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
    if (!(await resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM")).allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    const canView = await staffCanViewCompetition(req.authUser!, session) || await studentCanReadChallengeState(req.authUser!, session);
    if (!canView) return res.status(StatusCodes.FORBIDDEN).json({ message: "Challenge state access denied" });
    res.json(challengeState(session));
  }));

  classroomRouter.post("/sessions/:id/competition/configure", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const payload = competitionConfigSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id);
    if (!session || session.status !== "live") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
    if (!(await resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM")).allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    if (!(await teacherCanManageCompetition(req.authUser!, session))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Competition control denied" });
    }

    const batch = activeBatch(session);
    if (!batch) return res.status(StatusCodes.CONFLICT).json({ message: "No active question batch to configure" });
    const batchQuestionIds = Array.from(new Set((batch.questionIds || []).map(String)));
    const batchQuestionSet = new Set(batchQuestionIds);
    const requestedChallengeIds = Array.from(new Set(payload.challengeQuestionIds.map(String)));
    if (requestedChallengeIds.some((questionId) => !batchQuestionSet.has(questionId))) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Challenge questions must belong to the active batch" });
    }
    if (payload.competitionEnabled && requestedChallengeIds.length > 0 && requestedChallengeIds.length !== batchQuestionIds.length) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "التحدي المؤقت يجب أن يشمل الدفعة النشطة كاملة. أنشئ دفعة مستقلة للسؤال إذا أردت تحدياً لسؤال واحد فقط.",
      });
    }

    const challengeQuestionIds = payload.competitionEnabled
      ? (requestedChallengeIds.length > 0 ? batchQuestionIds : [])
      : requestedChallengeIds;
    const timerStartedAt = payload.competitionEnabled ? new Date() : null;
    const timerEndsAt = timerStartedAt ? new Date(timerStartedAt.getTime() + payload.durationSeconds * 1000) : null;
    batch.challengeQuestionIds = challengeQuestionIds;
    batch.competitionEnabled = payload.competitionEnabled;
    batch.challengeDurationSeconds = payload.competitionEnabled ? payload.durationSeconds : null;
    batch.timerStartedAt = timerStartedAt;
    batch.timerEndsAt = timerEndsAt;
    await session.save();

    const state = challengeState(session.toObject());
    emitClassroomEvent(classroomSessionId(session), "competition:updated", state);
    res.json(state);
  }));

  classroomRouter.get("/sessions/:id/competition", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });

    if (req.authUser!.role !== "admin" && !(await resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM")).allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    if (!(await staffCanViewCompetition(req.authUser!, session))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Competition access denied" });
    }

    const questionIds = activeCompetitionQuestionIds(session);
    if (questionIds.length === 0) {
      return res.json({ sessionId: classroomSessionId(session), questionIds: [], leaderboard: [], participantCount: 0 });
    }

    const responses = await ClassroomResponseModel.find({
      sessionId: classroomSessionId(session),
      questionId: { $in: questionIds },
    }).select("studentId questionId isCorrect submittedAt").lean() as any[];

    const standings = buildClassroomCompetitionStandings(responses.map((response: any) => ({
      studentId: String(response.studentId),
      isCorrect: Boolean(response.isCorrect),
      submittedAt: response.submittedAt || null,
    })));
    const studentIds = standings.map((entry) => entry.studentId);
    const objectIds = studentIds.filter((id) => Types.ObjectId.isValid(id));
    const users = studentIds.length > 0
      ? await UserModel.find({
          $or: [
            { id: { $in: studentIds } },
            ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
          ],
        }).select("id name displayName").lean() as any[]
      : [];
    const nameById = new Map<string, string>();
    users.forEach((user) => {
      const name = String(user.displayName || user.name || "طالب");
      if (user.id) nameById.set(String(user.id), name);
      if (user._id) nameById.set(String(user._id), name);
    });

    const leaderboard = standings.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      name: nameById.get(entry.studentId) || "طالب",
    }));

    const batch = activeBatch(session);
    res.json({
      sessionId: classroomSessionId(session),
      activeBatchId: session.activeBatchId || "",
      questionIds,
      participantCount: leaderboard.length,
      leaderboard,
      scoring: { correctAnswerPoints: 100, speedBonus: false },
      challenge: {
        challengeQuestionIds: (batch?.challengeQuestionIds || []).map(String),
        competitionEnabled: Boolean(batch?.competitionEnabled),
        timerEndsAt: batch?.timerEndsAt || null,
      },
    });
  }));
}
