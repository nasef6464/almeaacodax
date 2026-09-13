import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../../middleware/auth.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { UserModel } from "../../models/User.js";
import { resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

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

const activeCompetitionQuestionIds = (session: any) => {
  if (session.activeBatchId && Array.isArray(session.questionBatches)) {
    const batch = session.questionBatches.find((entry: any) => String(entry.batchId) === String(session.activeBatchId));
    if (batch?.questionIds?.length) return batch.questionIds.map(String);
  }
  if (Array.isArray(session.publishedQuestionIds) && session.publishedQuestionIds.length > 0) {
    return session.publishedQuestionIds.map(String);
  }
  if (typeof session.activeQuestionIndex === "number" && session.questionSnapshots?.[session.activeQuestionIndex]) {
    return [String(session.questionSnapshots[session.activeQuestionIndex].questionId)];
  }
  return [];
};

export function registerClassroomCompetitionRoutes(classroomRouter: Router) {
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

    const byStudent = new Map<string, { studentId: string; answered: number; correct: number; lastSubmittedAt: Date | null }>();
    for (const response of responses) {
      const studentId = String(response.studentId);
      const current = byStudent.get(studentId) || { studentId, answered: 0, correct: 0, lastSubmittedAt: null };
      current.answered += 1;
      if (response.isCorrect) current.correct += 1;
      const submittedAt = response.submittedAt ? new Date(response.submittedAt) : null;
      if (submittedAt && (!current.lastSubmittedAt || submittedAt > current.lastSubmittedAt)) current.lastSubmittedAt = submittedAt;
      byStudent.set(studentId, current);
    }

    const studentIds = Array.from(byStudent.keys());
    const users = studentIds.length > 0
      ? await UserModel.find({ _id: { $in: studentIds } }).select("name displayName").lean() as any[]
      : [];
    const nameById = new Map(users.map((user) => [String(user._id), String(user.displayName || user.name || "طالب")]));

    const leaderboard = Array.from(byStudent.values())
      .map((entry) => ({
        studentId: entry.studentId,
        name: nameById.get(entry.studentId) || "طالب",
        answered: entry.answered,
        correct: entry.correct,
        accuracy: entry.answered > 0 ? Math.round((entry.correct / entry.answered) * 100) : 0,
        score: entry.correct * 100,
        lastSubmittedAt: entry.lastSubmittedAt,
      }))
      .sort((a, b) => b.correct - a.correct || b.answered - a.answered || new Date(a.lastSubmittedAt || 0).getTime() - new Date(b.lastSubmittedAt || 0).getTime())
      .map((entry, index) => ({ rank: index + 1, ...entry }));

    res.json({
      sessionId: classroomSessionId(session),
      activeBatchId: session.activeBatchId || "",
      questionIds,
      participantCount: leaderboard.length,
      leaderboard,
      scoring: { correctAnswerPoints: 100, speedBonus: false },
    });
  }));
}
