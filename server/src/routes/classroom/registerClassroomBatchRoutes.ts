import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { emitClassroomEvent } from "../../realtime/classroomRealtime.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

const canControlBatch = async (actor: any, session: any) => {
  if (actor.role === "admin") return true;
  if (actor.role !== "teacher" || String(session.teacherId) !== String(actor.id)) return false;
  const [schoolAccess, assignment, entitlement] = await Promise.all([
    ensureTeacherSchoolAccess(actor, String(session.schoolId)),
    TeachingAssignmentModel.exists({
      schoolId: String(session.schoolId),
      classId: String(session.classId),
      teacherId: String(actor.id),
      status: "active",
    }),
    resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM"),
  ]);
  return Boolean(schoolAccess && assignment && entitlement.allowed);
};

const buildBatchMiniReport = async (session: any, batch: any) => {
  const sessionId = classroomSessionId(session);
  const questionIds = (batch.questionIds || []).map(String);
  const questionSet = new Set(questionIds);
  const responses = questionIds.length
    ? await ClassroomResponseModel.find({ sessionId, questionId: { $in: questionIds } }).lean()
    : [];

  const correct = responses.filter((response: any) => response.isCorrect).length;
  const answered = responses.length;
  const skillMap = new Map<string, { skillId: string; answered: number; correct: number }>();

  for (const question of session.questionSnapshots || []) {
    if (!questionSet.has(String(question.questionId))) continue;
    const questionResponses = responses.filter((response: any) => String(response.questionId) === String(question.questionId));
    for (const skillId of (question.skillIds || []).map(String).filter(Boolean)) {
      const current = skillMap.get(skillId) || { skillId, answered: 0, correct: 0 };
      current.answered += questionResponses.length;
      current.correct += questionResponses.filter((response: any) => response.isCorrect).length;
      skillMap.set(skillId, current);
    }
  }

  const skills = Array.from(skillMap.values())
    .map((skill) => ({
      ...skill,
      accuracy: skill.answered > 0 ? Math.round((skill.correct / skill.answered) * 100) : null,
    }))
    .sort((left, right) => (left.accuracy ?? 101) - (right.accuracy ?? 101));

  return {
    batchId: String(batch.batchId || ""),
    label: batch.label || "دفعة أسئلة",
    questionCount: questionIds.length,
    answered,
    correct,
    wrong: answered - correct,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
    skills,
  };
};

export function registerClassroomBatchRoutes(classroomRouter: Router) {
  classroomRouter.post(
    "/sessions/:id/batches/:batchId/end",
    requireAuth,
    requireRole(["teacher", "admin"]),
    asyncHandler(async (req, res) => {
      const session = await ClassroomSessionModel.findById(req.params.id);
      if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
      if (session.status !== "live") return res.status(StatusCodes.CONFLICT).json({ message: "Only a live session batch can be ended" });
      if (!(await canControlBatch(req.authUser!, session))) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Batch control denied" });
      }

      const batch = session.questionBatches?.find((item: any) => String(item.batchId) === String(req.params.batchId));
      if (!batch) return res.status(StatusCodes.NOT_FOUND).json({ message: "Batch not found" });
      if (String(session.activeBatchId || "") !== String(batch.batchId)) {
        if (batch.endedAt) return res.json({ alreadyEnded: true, miniReport: await buildBatchMiniReport(session, batch) });
        return res.status(StatusCodes.CONFLICT).json({ message: "Only the active batch can be ended" });
      }

      const endedAt = new Date();
      if (!batch.endedAt) batch.endedAt = endedAt;
      if (batch.competitionEnabled && (!batch.timerEndsAt || new Date(batch.timerEndsAt).getTime() > endedAt.getTime())) {
        batch.timerEndsAt = endedAt;
      }

      session.activeBatchId = "";
      session.activeQuestionIndex = null;
      session.publishedQuestionIds = [];
      await session.save();

      const miniReport = await buildBatchMiniReport(session, batch);
      emitClassroomEvent(classroomSessionId(session), "batch:ended", {
        sessionId: classroomSessionId(session),
        batchId: String(batch.batchId),
        endedAt,
      });

      res.json({ ended: true, endedAt, miniReport });
    }),
  );
}
