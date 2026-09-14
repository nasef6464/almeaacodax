import { createHmac } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { QuestionModel } from "../../models/Question.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { buildClassroomSessionReport } from "../../modules/schools/application/classroomSupervisorReport.js";
import { classroomQuestionVisibilityFilter, normalizeQuestionIds } from "../../modules/schools/application/classroomQuestionAccess.js";
import { hasActiveSchoolRole } from "../../modules/schools/application/schoolContextResolver.js";
import { emitClassroomEvent, emitClassroomEventToClass } from "../../sockets/classroomEvents.js";

export const hashClassroomPin = (pin: string) => createHmac("sha256", env.JWT_SECRET).update(pin).digest("hex");
export const classroomSessionId = (doc: any) => String(doc.id || doc._id);

export const idQuery = (ids: string[]) => ({
  $or: [
    { id: { $in: ids } },
    ...(ids.some((id) => Types.ObjectId.isValid(id))
      ? [{ _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) } }]
      : []),
  ],
});

const snapshotQuestion = (question: any) => ({
  questionId: String(question.id || question._id),
  text: question.text,
  imageUrl: question.imageUrl || "",
  options: question.options || [],
  type: question.type,
  correctOptionIndex: question.correctOptionIndex,
  skillIds: question.skillIds || [],
  explanation: question.explanation || "",
  sectionId: question.sectionId || "",
  pathId: question.pathId || "",
  subject: question.subject || "",
  difficulty: question.difficulty || "Medium",
});

export async function loadApprovedVisibleQuestions(questionIds: string[], schoolId: string, actorId: string) {
  const ids = normalizeQuestionIds(questionIds);
  const objectIds = ids.filter((id) => Types.ObjectId.isValid(id));
  const questions = await QuestionModel.find({
    $and: [
      { $or: [{ id: { $in: ids } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])] },
      { type: { $in: ["mcq", "true_false"] } },
      { approvalStatus: "approved" },
      classroomQuestionVisibilityFilter(schoolId, actorId),
    ],
  }).lean();
  const byId = new Map<string, any>();
  for (const question of questions as any[]) {
    if (question.id) byId.set(String(question.id), question);
    if (question._id) byId.set(String(question._id), question);
  }
  const resolved = ids.map((id) => byId.get(id)).filter(Boolean);
  if (resolved.length !== ids.length) return null;
  return resolved.map(snapshotQuestion);
}

export async function ensureTeacherSchoolAccess(actor: any, schoolId: string) {
  if (actor.role === "admin") return true;
  const [hasTeacherContext, assigned] = await Promise.all([
    hasActiveSchoolRole(actor, schoolId, "teacher"),
    TeachingAssignmentModel.exists({ schoolId, teacherId: actor.id, status: "active" }),
  ]);
  return Boolean(hasTeacherContext && assigned);
}

export async function finalizeClassroomSession(session: any) {
  const sessionId = classroomSessionId(session);
  if (session.status !== "ended") {
    const endedAt = new Date();
    session.status = "ended";
    session.endedAt = endedAt;
    session.activeQuestionIndex = null;
    if (session.activeBatchId && Array.isArray(session.questionBatches)) {
      const activeBatch = session.questionBatches.find((batch: any) => String(batch.batchId) === String(session.activeBatchId));
      if (activeBatch && !activeBatch.endedAt) activeBatch.endedAt = endedAt;
    }
    session.activeBatchId = "";
    await session.save();
  }
  const report = await buildClassroomSessionReport(session.toObject ? session.toObject() : session);
  session.reportSnapshot = report;
  await session.save();
  // Classroom rooms contain students. Broadcast only lifecycle metadata here;
  // the canonical report remains available through staff-authorized HTTP routes.
  emitClassroomEvent(sessionId, "session:ended", { sessionId, status: "ended" });
  emitClassroomEventToClass(String(session.classId), "session:ended", { sessionId, status: "ended" });
  return report;
}

export async function safelyClosePreviousLiveSessions(schoolId: string, classId: string, excludeSessionId?: string) {
  const query: Record<string, any> = { schoolId, classId, status: "live" };
  if (excludeSessionId) query._id = { $ne: excludeSessionId };
  const liveSessions = await ClassroomSessionModel.find(query);
  for (const previous of liveSessions) await finalizeClassroomSession(previous);
}
