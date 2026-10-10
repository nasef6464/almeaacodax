import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../middleware/auth.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { QuizModel } from "../../../models/Quiz.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { UserModel } from "../../../models/User.js";
import { GroupModel } from "../../../models/Group.js";
import { QuizRetakeModel, quizRetakeId } from "../infrastructure/quizRetakeModel.js";
import { buildOwnedDocumentQuery, buildDocumentsByIdsQuery } from "../infrastructure/quizDocumentQuery.js";
import { assertSupervisorDirectedQuizScope, assertTeacherDirectedQuizScope } from "../application/quizAccessPolicy.js";
import { assertManagedContentScope } from "../../../services/managedContentScope.js";
import { getQuizMaxAttempts } from "../application/quizAttemptContext.js";
import { validateQuizWindow } from "../application/quizAvailability.js";

export const quizRetakeRouter = Router();
const grantSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1).max(100),
  opensAt: z.string().datetime({ offset: true }),
  closesAt: z.string().datetime({ offset: true }),
});

quizRetakeRouter.post("/:id/retakes", requireAuth, requireRole(["admin", "teacher", "supervisor"]), asyncHandler(async (req, res) => {
  const payload = grantSchema.parse(req.body);
  validateQuizWindow(payload);
  if (Date.parse(payload.closesAt) <= Date.now()) return res.status(400).json({ message: "Retake end time must be in the future" });
  const quiz = await QuizModel.findOne(buildOwnedDocumentQuery(req.params.id, req.authUser!)).lean();
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  if (!(quiz.targetUserIds?.length || quiz.targetGroupIds?.length)) return res.status(400).json({ message: "Retakes require a directed assessment" });
  // Reuse definition-management authority; a grant never broadens its audience.
  if (req.authUser!.role !== "teacher") await assertManagedContentScope(req.authUser!, quiz);
  await assertSupervisorDirectedQuizScope(req.authUser!, quiz);
  await assertTeacherDirectedQuizScope(req.authUser!, quiz);
  const studentIds = [...new Set(payload.studentIds)];
  const students = await UserModel.find(buildDocumentsByIdsQuery(studentIds)).select("id _id role isActive").lean();
  const byId = new Map(students.map((s: any) => [String(s.id || s._id), s]));
  const eligible = new Set((quiz.targetUserIds || []).map(String));
  if (studentIds.some(id => !eligible.has(id)) && quiz.targetGroupIds?.length) {
    const groups = await GroupModel.aggregate<{ studentIds: string[] }>([
      { $match: { $and: [buildDocumentsByIdsQuery(quiz.targetGroupIds.map(String)), { studentIds: { $in: studentIds } }] } },
      { $project: { _id: 0, studentIds: { $setIntersection: [{ $ifNull: ['$studentIds', []] }, { $literal: studentIds }] } } },
    ]);
    groups.forEach(group => group.studentIds.forEach(id => eligible.add(id)));
  }
  for (const studentId of studentIds) {
    const student = byId.get(studentId);
    if (!student || student.role !== "student" || student.isActive === false || !eligible.has(studentId)) {
      return res.status(403).json({ message: "Retake recipients must be active assigned students" });
    }
  }
  const quizId = String(quiz.id || quiz._id);
  const counts = await QuizResultModel.aggregate<{ _id: string; count: number }>([
    { $match: { quizId, userId: { $in: studentIds } } }, { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const used = new Map(counts.map(c => [c._id, c.count]));
  // Absolute allowance from saved outcomes makes a repeated grant idempotent.
  // Old results, scores and definition-wide attempts remain untouched.
  const operations = studentIds.map(studentId => ({ updateOne: {
    filter: { _id: quizRetakeId(quizId, studentId) },
    update: { $set: { quizId, studentId, opensAt: payload.opensAt, closesAt: payload.closesAt, grantedBy: req.authUser!.id },
      $max: { maxAttempts: Math.max(getQuizMaxAttempts(quiz), (used.get(studentId) || 0) + 1) } }, upsert: true,
  } }));
  try { await QuizRetakeModel.bulkWrite(operations, { ordered: false }); }
  catch (error: any) {
    if (error?.code !== 11000) throw error;
    // The built-in unique _id also protects first concurrent grants when an
    // environment does not automatically build secondary indexes.
    await QuizRetakeModel.bulkWrite(operations.map(op => ({ updateOne: { ...op.updateOne, upsert: false } })), { ordered: false });
  }
  return res.json({ grantedStudentIds: studentIds, opensAt: payload.opensAt, closesAt: payload.closesAt });
}));
