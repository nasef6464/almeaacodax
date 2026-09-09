import { createHmac, randomInt } from "node:crypto";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ClassroomResponseModel } from "../models/ClassroomResponse.js";
import { ClassroomParticipantModel } from "../models/ClassroomParticipant.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { QuestionModel } from "../models/Question.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { UserModel } from "../models/User.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";
import { projectClassroomQuestionForStudent } from "../modules/schools/application/classroomQuestionProjection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitClassroomEvent } from "../sockets/classroomEvents.js";
import { buildClassroomSessionReport, buildClassroomTeacherReports, classroomScopeFilter, resolveClassroomSupervisorScope } from "../modules/schools/application/classroomSupervisorReport.js";
import { buildClassroomSchoolIntelligence } from "../modules/schools/application/classroomSchoolIntelligence.js";

export const classroomRouter = Router();
const hashPin = (pin: string) => createHmac("sha256", env.JWT_SECRET).update(pin).digest("hex");
const sessionId = (doc: any) => String(doc.id || doc._id);
const createSchema = z.object({ schoolId: z.string().min(1), classId: z.string().min(1), questionIds: z.array(z.string().min(1)).min(1).max(10).refine((ids) => new Set(ids).size === ids.length, "Question IDs must be unique") });
const answerSchema = z.object({ selectedOptionIndex: z.number().int().min(0) });
const joinSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });

classroomRouter.post("/sessions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const payload = createSchema.parse(req.body);
  const entitlement = await resolveSchoolEntitlement(payload.schoolId, "SMART_CLASSROOM");
  if (!entitlement.allowed) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
  if (req.authUser!.role !== "admin") {
    const assigned = await TeachingAssignmentModel.exists({ schoolId: payload.schoolId, teacherId: req.authUser!.id, classId: payload.classId, status: "active" });
    if (!assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this class" });
  }
  const objectIds = payload.questionIds.filter((id) => Types.ObjectId.isValid(id));
  const questions = await QuestionModel.find({ $or: [{ id: { $in: payload.questionIds } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])], type: { $in: ["mcq", "true_false"] }, approvalStatus: "approved" }).lean();
  if (questions.length !== payload.questionIds.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Questions must be approved MCQ or true/false" });
  const byId = new Map(questions.map((question: any) => [String(question.id || question._id), question]));
  const snapshots = payload.questionIds.map((id) => { const q: any = byId.get(id); return { questionId: id, text: q.text, imageUrl: q.imageUrl, options: q.options, type: q.type, correctOptionIndex: q.correctOptionIndex, skillIds: q.skillIds || [] }; });
  const pin = String(randomInt(100000, 1000000));
  const session = await ClassroomSessionModel.create({ schoolId: payload.schoolId, classId: payload.classId, teacherId: req.authUser!.id, questionSnapshots: snapshots, pinHash: hashPin(pin), pinExpiresAt: new Date(Date.now() + 30 * 60_000) });
  res.status(StatusCodes.CREATED).json({ sessionId: sessionId(session), pin, status: session.status });
}));

classroomRouter.get("/questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const schoolId = z.string().min(1).parse(req.query.schoolId);
  if (req.authUser!.role !== "admin") {
    const assigned = await TeachingAssignmentModel.exists({ schoolId, teacherId: req.authUser!.id, status: "active" });
    if (!assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
  }
  const questions = await QuestionModel.find({ type: { $in: ["mcq", "true_false"] }, approvalStatus: "approved" })
    .select("id text imageUrl options type skillIds")
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({ questions: questions.map((question: any) => ({ questionId: String(question.id || question._id), text: question.text, imageUrl: question.imageUrl, options: question.options, type: question.type, skillIds: question.skillIds || [] })) });
}));

classroomRouter.get("/supervisor/today", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const sessions = await ClassroomSessionModel.find({ $and: [classroomScopeFilter(scope), { createdAt: { $gte: start } }] }).sort({ createdAt: -1 }).lean();
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

classroomRouter.get("/supervisor/sessions/:id/report", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const session = await ClassroomSessionModel.findOne({ $and: [{ _id: req.params.id }, classroomScopeFilter(scope)] }).lean();
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session report not found" });
  res.json({ report: await buildClassroomSessionReport(session) });
}));

classroomRouter.post("/sessions/:id/publish/:index", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id); const index = Number(req.params.index);
  if (!session || !Number.isInteger(index) || index < 0 || index >= session.questionSnapshots.length) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session or question not found" });
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  session.status = "live"; session.activeQuestionIndex = index; await session.save(); emitClassroomEvent(sessionId(session), "question:published", { activeQuestionIndex: index }); res.json({ status: session.status, activeQuestionIndex: index });
}));

classroomRouter.post("/sessions/:id/join", requireAuth, asyncHandler(async (req, res) => {
  const payload = joinSchema.parse(req.body); const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session || session.status === "ended" || session.pinExpiresAt < new Date() || hashPin(payload.pin) !== session.pinHash) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student" || String(student.schoolId) !== String(session.schoolId) || !(student.groupIds || []).map(String).includes(String(session.classId))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  await ClassroomParticipantModel.updateOne({ sessionId: sessionId(session), studentId: req.authUser!.id }, { $setOnInsert: { joinedAt: new Date() } }, { upsert: true });
  res.json({ joined: true, sessionId: sessionId(session) });
}));

classroomRouter.get("/sessions/:id/current", requireAuth, asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active question" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student" || String(student.schoolId) !== String(session.schoolId) || !(student.groupIds || []).map(String).includes(String(session.classId))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  const participant = await ClassroomParticipantModel.exists({ sessionId: sessionId(session), studentId: req.authUser!.id });
  if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before viewing questions" });
  res.json({ sessionId: sessionId(session), question: projectClassroomQuestionForStudent(session.questionSnapshots[session.activeQuestionIndex], true) });
}));

classroomRouter.put("/sessions/:id/answers/:questionId", requireAuth, asyncHandler(async (req, res) => {
  const payload = answerSchema.parse(req.body); const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
  const question = session.questionSnapshots[session.activeQuestionIndex]; if (!question || String(question.questionId) !== req.params.questionId) return res.status(StatusCodes.CONFLICT).json({ message: "Question is not active" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student" || String(student.schoolId) !== String(session.schoolId) || !(student.groupIds || []).map(String).includes(String(session.classId))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  const participant = await ClassroomParticipantModel.exists({ sessionId: sessionId(session), studentId: req.authUser!.id });
  if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before answering" });
  if (payload.selectedOptionIndex >= question.options.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Selected option is invalid" });
  const response = await ClassroomResponseModel.findOneAndUpdate({ sessionId: sessionId(session), questionId: question.questionId, studentId: req.authUser!.id }, { $setOnInsert: { selectedOptionIndex: payload.selectedOptionIndex, isCorrect: payload.selectedOptionIndex === question.correctOptionIndex } }, { upsert: true, new: true });
  const responseCount = await ClassroomResponseModel.countDocuments({ sessionId: sessionId(session), questionId: question.questionId });
  emitClassroomEvent(sessionId(session), "response:updated", { responseCount }); res.json({ accepted: true, responseId: String(response._id) });
}));

classroomRouter.post("/sessions/:id/end", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id); if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  if (session.status === "ended") return res.json({ report: session.reportSnapshot, alreadyEnded: true });
  const responses = await ClassroomResponseModel.find({ sessionId: sessionId(session) }).lean(); const participants = await ClassroomParticipantModel.countDocuments({ sessionId: sessionId(session) });
  const report = { sessionId: sessionId(session), schoolId: session.schoolId, classId: session.classId, participantCount: participants, responseCount: responses.length, correctCount: responses.filter((response: any) => response.isCorrect).length, endedAt: new Date().toISOString() };
  session.status = "ended"; session.endedAt = new Date(); session.activeQuestionIndex = null; session.reportSnapshot = report; await session.save(); emitClassroomEvent(sessionId(session), "session:ended", { report }); res.json({ report });
}));

classroomRouter.get("/sessions/:id/aggregate", requireAuth, asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  const isTeacher = req.authUser!.role === "admin" || String(session.teacherId) === req.authUser!.id;
  const isStudent = student?.role === "student" && String(student.schoolId) === String(session.schoolId) && (student.groupIds || []).map(String).includes(String(session.classId));
  if (!isTeacher && !isStudent) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  const responses = await ClassroomResponseModel.find({ sessionId: sessionId(session) }).lean();
  const distribution = responses.reduce((summary: Record<string, number>, response: any) => { const key = String(response.selectedOptionIndex); summary[key] = (summary[key] || 0) + 1; return summary; }, {});
  const questions = isTeacher ? session.questionSnapshots.map((question: any, index: number) => ({ index, ...projectClassroomQuestionForStudent(question, true) })) : undefined;
  res.json({ sessionId: sessionId(session), status: session.status, activeQuestionIndex: session.activeQuestionIndex, responseCount: responses.length, distribution, report: session.status === "ended" ? session.reportSnapshot : null, questions });
}));
