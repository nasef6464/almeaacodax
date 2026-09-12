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
import { GroupModel } from "../models/Group.js";
import { PathModel } from "../models/Path.js";
import { StudyPlanModel } from "../models/StudyPlan.js";
import { SchoolInterventionModel } from "../models/SchoolIntervention.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";
import { projectClassroomQuestionForStudent } from "../modules/schools/application/classroomQuestionProjection.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitClassroomEvent, emitClassroomEventToClass } from "../sockets/classroomEvents.js";
import { buildClassroomSessionReport, buildClassroomTeacherReports, classroomScopeFilter, resolveClassroomSupervisorScope } from "../modules/schools/application/classroomSupervisorReport.js";
import { buildClassroomSchoolIntelligence, buildClassroomSkillEvidence } from "../modules/schools/application/classroomSchoolIntelligence.js";
import { hasActiveSchoolRole } from "../modules/schools/application/schoolContextResolver.js";

import { sensitiveActionRateLimiter } from "../middleware/rateLimiters.js";

export const classroomRouter = Router();
const hashPin = (pin: string) => createHmac("sha256", env.JWT_SECRET).update(pin).digest("hex");
const sessionId = (doc: any) => String(doc.id || doc._id);

async function safelyClosePreviousLiveSessions(schoolId: string, classId: string, excludeSessionId?: string) {
  const query: Record<string, any> = { schoolId, classId, status: "live" };
  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }
  const liveSessions = await ClassroomSessionModel.find(query);
  for (const prev of liveSessions) {
    const sId = sessionId(prev);
    const [responses, participants] = await Promise.all([
      ClassroomResponseModel.find({ sessionId: sId }).lean(),
      ClassroomParticipantModel.countDocuments({ sessionId: sId }),
    ]);
    const report = {
      sessionId: sId,
      schoolId: prev.schoolId,
      classId: prev.classId,
      participantCount: participants,
      responseCount: responses.length,
      correctCount: responses.filter((r: any) => r.isCorrect).length,
      endedAt: new Date().toISOString(),
    };
    prev.status = "ended";
    prev.endedAt = new Date();
    prev.activeQuestionIndex = null;
    prev.reportSnapshot = report;
    await prev.save();
    emitClassroomEvent(sId, "session:ended", { report });
    emitClassroomEventToClass(prev.classId, "session:ended", { sessionId: sId });
  }
}

const createSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  questionIds: z.array(z.string().min(1)).min(1).max(30).refine((ids) => new Set(ids).size === ids.length, "Question IDs must be unique"),
  day: z.string().optional().default(""),
  period: z.number().int().min(1).max(12).nullable().optional().default(null),
  subjectName: z.string().optional().default(""),
  className: z.string().optional().default(""),
  publishedMode: z.enum(["single", "batch"]).optional().default("single"),
  autoStart: z.boolean().optional().default(false),
});
const appendQuestionsSchema = z.object({ questionIds: z.array(z.string().min(1)).min(1).max(20), autoPublishFirst: z.boolean().optional().default(false) });
const answerSchema = z.object({ selectedOptionIndex: z.number().int().min(0) });
const joinSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });
const interventionSchema = z.object({ schoolId: z.string().min(1), classId: z.string().optional().default(""), skillId: z.string().min(1), targetStudentIds: z.array(z.string().min(1)).min(1).max(50), pathId: z.string().min(1), dailyMinutes: z.number().int().min(15).max(240).optional().default(90), followUpAt: z.string().datetime().optional(), remediationThreshold: z.number().min(0).max(100).optional(), minimumEvidence: z.number().int().min(1).max(500).optional() });
const idQuery = (ids: string[]) => ({ $or: [{ id: { $in: ids } }, ...(ids.filter((id) => Types.ObjectId.isValid(id)).length ? [{ _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) } }] : [])] });

classroomRouter.post("/sessions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const payload = createSchema.parse(req.body);
  const entitlement = await resolveSchoolEntitlement(payload.schoolId, "SMART_CLASSROOM");
  if (!entitlement.allowed) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
  const classroom = Types.ObjectId.isValid(payload.classId)
    ? await GroupModel.exists({ _id: payload.classId, type: "CLASS", parentId: payload.schoolId })
    : null;
  if (!classroom) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Class does not belong to this school" });
  if (req.authUser!.role !== "admin") {
    const [hasTeacherContext, assigned] = await Promise.all([
      hasActiveSchoolRole(req.authUser!, payload.schoolId, "teacher"),
      TeachingAssignmentModel.exists({ schoolId: payload.schoolId, teacherId: req.authUser!.id, classId: payload.classId, status: "active" }),
    ]);
    if (!hasTeacherContext || !assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school and class" });
  }
  const objectIds = payload.questionIds.filter((id) => Types.ObjectId.isValid(id));
  const questions = await QuestionModel.find({ $or: [{ id: { $in: payload.questionIds } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])], type: { $in: ["mcq", "true_false"] }, approvalStatus: "approved" }).lean();
  if (questions.length !== payload.questionIds.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Questions must be approved MCQ or true/false" });
  const byId = new Map(questions.map((question: any) => [String(question.id || question._id), question]));
  const snapshots = payload.questionIds.map((id) => {
    const q: any = byId.get(id);
    return {
      questionId: id,
      text: q.text,
      imageUrl: q.imageUrl || "",
      options: q.options || [],
      type: q.type,
      correctOptionIndex: q.correctOptionIndex,
      skillIds: q.skillIds || [],
      explanation: q.explanation || "",
      sectionId: q.sectionId || "",
      subject: q.subject || "",
      difficulty: q.difficulty || "Medium",
    };
  });

  const pin = String(randomInt(100000, 1000000));
  const initialStatus = payload.autoStart ? "live" : "draft";
  const activeIdx = payload.autoStart ? 0 : null;
  const initialPublished = payload.autoStart
    ? (payload.publishedMode === "batch" ? payload.questionIds : [payload.questionIds[0]])
    : [];

  if (initialStatus === "live") {
    // Invariant: only one active session per school and class
    await safelyClosePreviousLiveSessions(payload.schoolId, payload.classId);
  }

  const session = await ClassroomSessionModel.create({
    schoolId: payload.schoolId,
    classId: payload.classId,
    teacherId: req.authUser!.id,
    day: payload.day || "",
    period: payload.period || null,
    subjectName: payload.subjectName || "",
    className: payload.className || "",
    publishedMode: payload.publishedMode || "single",
    publishedQuestionIds: initialPublished,
    status: initialStatus,
    activeQuestionIndex: activeIdx,
    questionSnapshots: snapshots,
    pinHash: hashPin(pin),
    pinExpiresAt: new Date(Date.now() + 30 * 60_000),
  });

  if (session.status === "live") {
    emitClassroomEventToClass(payload.classId, "classroom:started", {
      sessionId: sessionId(session),
      schoolId: session.schoolId,
      classId: session.classId,
      className: session.className,
      teacherName: req.authUser!.name || "معلم المادة",
    });
  }

  res.status(StatusCodes.CREATED).json({ sessionId: sessionId(session), pin, status: session.status });
}));

classroomRouter.get("/questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const schoolId = z.string().min(1).parse(req.query.schoolId);
  if (req.authUser!.role !== "admin") {
    const assignments = await TeachingAssignmentModel.find({ schoolId, teacherId: req.authUser!.id, status: "active" }).select("classId").lean();
    const assignedClassIds = assignments.map((assignment) => String(assignment.classId)).filter((id) => Types.ObjectId.isValid(id));
    const [hasTeacherContext, assigned] = await Promise.all([
      hasActiveSchoolRole(req.authUser!, schoolId, "teacher"),
      assignedClassIds.length ? GroupModel.exists({ _id: { $in: assignedClassIds }, type: "CLASS", parentId: schoolId }) : null,
    ]);
    if (!hasTeacherContext || !assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
  }
  const filter: Record<string, any> = { type: { $in: ["mcq", "true_false"] }, approvalStatus: "approved" };
  if (typeof req.query.pathId === "string" && req.query.pathId.trim()) filter.pathId = req.query.pathId.trim();
  if (typeof req.query.subject === "string" && req.query.subject.trim()) filter.subject = req.query.subject.trim();
  if (typeof req.query.sectionId === "string" && req.query.sectionId.trim()) filter.sectionId = req.query.sectionId.trim();
  if (typeof req.query.skillId === "string" && req.query.skillId.trim()) filter.skillIds = req.query.skillId.trim();
  if (typeof req.query.difficulty === "string" && req.query.difficulty.trim()) filter.difficulty = req.query.difficulty.trim();
  if (typeof req.query.search === "string" && req.query.search.trim()) filter.text = { $regex: req.query.search.trim(), $options: "i" };
  const questions = await QuestionModel.find(filter)
    .select("id text imageUrl options type skillIds pathId subject sectionId difficulty examType explanation")
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({
    questions: questions.map((question: any) => ({
      questionId: String(question.id || question._id),
      text: question.text,
      imageUrl: question.imageUrl || "",
      options: question.options,
      type: question.type,
      skillIds: question.skillIds || [],
      pathId: question.pathId || "",
      subject: question.subject || "",
      sectionId: question.sectionId || "",
      difficulty: question.difficulty || "Medium",
      examType: question.examType || "general",
      explanation: question.explanation || "",
    })),
  });
}));

classroomRouter.get("/student/active-session", requireAuth, asyncHandler(async (req, res) => {
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role name").lean() as any;
  if (!student || student.role !== "student" || !student.schoolId) {
    return res.json({ hasActiveSession: false });
  }
  const studentClassIds = (student.groupIds || []).map(String).filter((id: string) => Types.ObjectId.isValid(id));
  if (studentClassIds.length === 0) {
    return res.json({ hasActiveSession: false });
  }
  const session = await ClassroomSessionModel.findOne({
    schoolId: String(student.schoolId),
    classId: { $in: studentClassIds },
    status: { $in: ["live", "scheduled"] },
    pinExpiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean() as any;

  if (!session) {
    return res.json({ hasActiveSession: false });
  }

  const [teacher, classroomGroup] = await Promise.all([
    UserModel.findById(session.teacherId).select("name displayName email").lean() as any,
    GroupModel.findById(session.classId).select("name").lean() as any,
  ]);

  res.json({
    hasActiveSession: true,
    session: {
      sessionId: sessionId(session),
      schoolId: session.schoolId,
      classId: session.classId,
      className: classroomGroup?.name || "فصلك الدراسي",
      teacherName: teacher?.displayName || teacher?.name || "معلم المادة",
      status: session.status,
      activeQuestionIndex: session.activeQuestionIndex,
      totalQuestions: session.questionSnapshots?.length || 0,
    },
  });
}));

classroomRouter.get("/teacher/history", requireAuth, requireRole(["teacher", "school_admin", "admin"]), asyncHandler(async (req, res) => {
  const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId.trim() : "";
  const filter: Record<string, any> = {};
  if (req.authUser!.role === "teacher") {
    filter.teacherId = req.authUser!.id;
  }
  if (schoolId) {
    filter.schoolId = schoolId;
  } else if (req.authUser!.schoolId) {
    filter.schoolId = req.authUser!.schoolId;
  }
  const limit = z.coerce.number().int().min(1).max(100).catch(50).parse(req.query.limit);
  const sessions = await ClassroomSessionModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ sessions: await Promise.all(sessions.map(buildClassroomSessionReport)) });
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

classroomRouter.get("/supervisor/interventions", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const interventions = await SchoolInterventionModel.find(classroomScopeFilter(scope)).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ interventions });
}));

classroomRouter.post("/supervisor/interventions", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const payload = interventionSchema.parse(req.body);
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const permitted = scope.all || scope.schoolIds.includes(payload.schoolId) || (!!payload.classId && scope.classIds.includes(payload.classId));
  if (!permitted) return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention scope denied" });
  const entitlement = await resolveSchoolEntitlement(payload.schoolId, "INTERVENTION_CENTER");
  if (!entitlement.allowed) return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention Center is not enabled for this school" });
  if (payload.classId) {
    const classroom = await GroupModel.findOne({ _id: payload.classId, type: "CLASS", parentId: payload.schoolId }).lean();
    if (!classroom) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Class does not belong to this school" });
  }
  const [students, path] = await Promise.all([
    UserModel.find({ role: "student", ...idQuery(payload.targetStudentIds) }).select("_id id name schoolId groupIds").lean(),
    PathModel.findOne(idQuery([payload.pathId])).select("_id id name").lean(),
  ]);
  if (!path || students.length !== payload.targetStudentIds.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Path or target students not found" });
  const targetIds = students.map((student: any) => String(student.id || student._id));
  const targetsInScope = students.every((student: any) => {
    const groups = (student.groupIds || []).map(String);
    if (payload.classId) return groups.includes(payload.classId) && (scope.all || scope.schoolIds.includes(payload.schoolId) || scope.classIds.includes(payload.classId));
    return String(student.schoolId || "") === payload.schoolId && (scope.all || scope.schoolIds.includes(payload.schoolId));
  });
  if (!targetsInScope) return res.status(StatusCodes.FORBIDDEN).json({ message: "Intervention target is outside your school/class scope" });
  const baseline = await buildClassroomSkillEvidence({ schoolId: payload.schoolId, classId: payload.classId || undefined, skillId: payload.skillId, studentIds: targetIds });
  const now = new Date(); const end = new Date(now); end.setDate(end.getDate() + 13);
  const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const studyPlans = await Promise.all(students.map(async (student: any) => {
    const studentId = String(student.id || student._id);
    return StudyPlanModel.create({ id: `school_intervention_${studentId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, userId: studentId, name: `خطة علاج مهارة ${payload.skillId}`, pathId: String((path as any).id || (path as any)._id), subjectIds: [], courseIds: [], startDate: dateKey(now), endDate: dateKey(end), skipCompletedQuizzes: true, offDays: [], dailyMinutes: payload.dailyMinutes, preferredStartTime: "17:00", status: "active" });
  }));
  const intervention = await SchoolInterventionModel.create({ schoolId: payload.schoolId, classId: payload.classId, skillId: payload.skillId, targetStudentIds: targetIds, actionType: "study_plan", actionRef: String((path as any).id || (path as any)._id), assignedBy: req.authUser!.id, followUpAt: payload.followUpAt ? new Date(payload.followUpAt) : null, remediationThreshold: payload.remediationThreshold, minimumEvidence: payload.minimumEvidence, baseline });
  res.status(StatusCodes.CREATED).json({ intervention, studyPlanIds: studyPlans.map((plan: any) => plan.id) });
}));

classroomRouter.get("/supervisor/interventions/:id/outcome", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const intervention = await SchoolInterventionModel.findOne({ $and: [{ _id: req.params.id }, classroomScopeFilter(scope)] }).lean() as any;
  if (!intervention) return res.status(StatusCodes.NOT_FOUND).json({ message: "Intervention not found" });
  const outcome = await buildClassroomSkillEvidence({ schoolId: intervention.schoolId, classId: intervention.classId || undefined, skillId: intervention.skillId, studentIds: intervention.targetStudentIds, from: intervention.createdAt });
  const minimumEvidence = intervention.minimumEvidence ?? null;
  const enoughEvidence = minimumEvidence === null || (intervention.baseline.evidenceCount >= minimumEvidence && outcome.evidenceCount >= minimumEvidence);
  const delta = intervention.baseline.accuracy === null || outcome.accuracy === null ? null : outcome.accuracy - intervention.baseline.accuracy;
  res.json({ intervention, outcome, comparison: { delta, minimumEvidence, confidence: enoughEvidence ? "measured" : "insufficient_evidence" } });
}));

classroomRouter.get("/supervisor/sessions/:id/report", requireAuth, requireRole(["admin", "supervisor"]), asyncHandler(async (req, res) => {
  const scope = await resolveClassroomSupervisorScope(req.authUser!);
  const session = await ClassroomSessionModel.findOne({ $and: [{ _id: req.params.id }, classroomScopeFilter(scope)] }).lean();
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session report not found" });
  res.json({ report: await buildClassroomSessionReport(session) });
}));

classroomRouter.post("/sessions/:id/publish/:index", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id);
  const index = Number(req.params.index);
  if (!session || !Number.isInteger(index) || index < 0 || index >= session.questionSnapshots.length) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Session or question not found" });
  }
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  }

  const wasNotLive = session.status !== "live";
  if (wasNotLive) {
    // Invariant: only one active live session per school and class
    await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
  }

  const targetQuestion = session.questionSnapshots[index];
  session.status = "live";
  session.activeQuestionIndex = index;
  // In single mode or explicit index publish, publishedQuestionIds focuses on active question
  if (session.publishedMode === "batch") {
    if (!session.publishedQuestionIds.includes(targetQuestion.questionId)) {
      session.publishedQuestionIds.push(targetQuestion.questionId);
    }
  } else {
    session.publishedMode = "single";
    session.publishedQuestionIds = [targetQuestion.questionId];
  }

  await session.save();
  emitClassroomEvent(sessionId(session), "question:published", { activeQuestionIndex: index, questionId: targetQuestion.questionId });
  if (wasNotLive) {
    emitClassroomEventToClass(session.classId, "classroom:started", {
      sessionId: sessionId(session),
      schoolId: session.schoolId,
      classId: session.classId,
      className: session.className,
      teacherName: req.authUser!.name || "معلم المادة",
    });
  }
  res.json({ status: session.status, activeQuestionIndex: index });
}));

classroomRouter.post("/sessions/join-by-pin", sensitiveActionRateLimiter, requireAuth, asyncHandler(async (req, res) => {
  const payload = joinSchema.parse(req.body);
  const hashed = hashPin(payload.pin);
  const session = await ClassroomSessionModel.findOne({
    pinHash: hashed,
    status: { $in: ["live", "scheduled", "draft"] },
    pinExpiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }).lean() as any;

  if (!session) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "لم يتم العثور على حصة نشطة بهذا الرمز أو قد انتهت صلاحيته." });
  }

  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (
    !student ||
    student.role !== "student" ||
    String(student.schoolId) !== String(session.schoolId) ||
    !(student.groupIds || []).map(String).includes(String(session.classId))
  ) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الرمز مخصص لحصة فصل دراسي آخر أو مدرسة أخرى." });
  }

  await ClassroomParticipantModel.updateOne(
    { sessionId: sessionId(session), studentId: req.authUser!.id },
    { $setOnInsert: { joinedAt: new Date() } },
    { upsert: true }
  );

  res.json({ joined: true, sessionId: sessionId(session), schoolId: session.schoolId, classId: session.classId });
}));

classroomRouter.post("/sessions/:id/instant-join", requireAuth, asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session || session.status === "ended") return res.status(StatusCodes.NOT_FOUND).json({ message: "الحصة غير نشطة أو انتهت" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student" || String(student.schoolId) !== String(session.schoolId) || !(student.groupIds || []).map(String).includes(String(session.classId))) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "غير مصرح لك بالانضمام لهذه الحصة المخصصة لفصل آخر" });
  }
  await ClassroomParticipantModel.updateOne({ sessionId: sessionId(session), studentId: req.authUser!.id }, { $setOnInsert: { joinedAt: new Date() } }, { upsert: true });
  res.json({ joined: true, sessionId: sessionId(session), schoolId: session.schoolId, classId: session.classId });
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

  const publishedSet = new Set(
    session.publishedQuestionIds && session.publishedQuestionIds.length > 0
      ? session.publishedQuestionIds
      : (typeof session.activeQuestionIndex === "number" && session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [])
  );

  const safeQuestions = session.questionSnapshots
    .map((q: any, i: number) => ({ index: i, raw: q }))
    .filter((item: any) => publishedSet.has(item.raw.questionId))
    .map((item: any) => ({ index: item.index, ...projectClassroomQuestionForStudent(item.raw, true) }));

  const currentQ = safeQuestions.find((q: any) => q.index === session.activeQuestionIndex) || safeQuestions[0] || null;
  const batchPosition = safeQuestions.findIndex((q: any) => q.index === session.activeQuestionIndex);
  res.json({
    sessionId: sessionId(session),
    question: currentQ,
    currentIndex: batchPosition >= 0 ? batchPosition : 0,
    globalIndex: session.activeQuestionIndex,
    totalQuestions: safeQuestions.length,
    questions: safeQuestions,
  });
}));

classroomRouter.put("/sessions/:id/answers/:questionId", requireAuth, asyncHandler(async (req, res) => {
  const payload = answerSchema.parse(req.body); const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
  
  const publishedSet = new Set(
    session.publishedQuestionIds && session.publishedQuestionIds.length > 0
      ? session.publishedQuestionIds
      : (typeof session.activeQuestionIndex === "number" && session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [])
  );
  if (!publishedSet.has(req.params.questionId)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "السؤال غير متاح للإجابة حالياً" });
  }

  const question = session.questionSnapshots.find((q: any) => String(q.questionId) === req.params.questionId) || session.questionSnapshots[session.activeQuestionIndex];
  if (!question) return res.status(StatusCodes.CONFLICT).json({ message: "Question is not active" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  if (!student || student.role !== "student" || String(student.schoolId) !== String(session.schoolId) || !(student.groupIds || []).map(String).includes(String(session.classId))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  const participant = await ClassroomParticipantModel.exists({ sessionId: sessionId(session), studentId: req.authUser!.id });
  if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before answering" });
  if (payload.selectedOptionIndex >= question.options.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Selected option is invalid" });
  const response = await ClassroomResponseModel.findOneAndUpdate(
    { sessionId: sessionId(session), questionId: question.questionId, studentId: req.authUser!.id },
    { $set: { selectedOptionIndex: payload.selectedOptionIndex, isCorrect: payload.selectedOptionIndex === question.correctOptionIndex, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
  const responseCount = await ClassroomResponseModel.countDocuments({ sessionId: sessionId(session), questionId: question.questionId });
  emitClassroomEvent(sessionId(session), "response:updated", { responseCount, questionId: question.questionId });
  res.json({ accepted: true, responseId: String(response._id) });
}));

classroomRouter.post("/sessions/:id/end", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id); if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  if (session.status === "ended") return res.json({ report: session.reportSnapshot, alreadyEnded: true });
  const responses = await ClassroomResponseModel.find({ sessionId: sessionId(session) }).lean(); const participants = await ClassroomParticipantModel.countDocuments({ sessionId: sessionId(session) });
  const report = { sessionId: sessionId(session), schoolId: session.schoolId, classId: session.classId, participantCount: participants, responseCount: responses.length, correctCount: responses.filter((response: any) => response.isCorrect).length, endedAt: new Date().toISOString() };
  session.status = "ended"; session.endedAt = new Date(); session.activeQuestionIndex = null; session.reportSnapshot = report; await session.save();
  emitClassroomEvent(sessionId(session), "session:ended", { report });
  emitClassroomEventToClass(session.classId, "session:ended", { sessionId: sessionId(session) });
  res.json({ report });
}));

classroomRouter.post("/sessions/:id/append-questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const payload = appendQuestionsSchema.parse(req.body);
  const session = await ClassroomSessionModel.findById(req.params.id);
  if (!session || session.status === "ended") {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "الحصة غير موجودة أو منتهية بالفعل" });
  }
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "غير مصرح لك بتعديل هذه الحصة" });
  }

  const objectIds = payload.questionIds.filter((id) => Types.ObjectId.isValid(id));
  const questions = await QuestionModel.find({
    $or: [{ id: { $in: payload.questionIds } }, ...(objectIds.length ? [{ _id: { $in: objectIds } }] : [])],
    type: { $in: ["mcq", "true_false"] },
    approvalStatus: "approved",
  }).lean();

  const byId = new Map(questions.map((question: any) => [String(question.id || question._id), question]));
  const newSnapshots = payload.questionIds
    .map((id) => {
      const q: any = byId.get(id);
      if (!q) return null;
      return {
        questionId: id,
        text: q.text,
        imageUrl: q.imageUrl || "",
        options: q.options || [],
        type: q.type,
        correctOptionIndex: q.correctOptionIndex,
        skillIds: q.skillIds || [],
        explanation: q.explanation || "",
        sectionId: q.sectionId || "",
        subject: q.subject || "",
        difficulty: q.difficulty || "Medium",
      };
    })
    .filter(Boolean);

  if (newSnapshots.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "لم يتم العثور على أسئلة معتمدة صالحة للإضافة" });
  }

  const existingIds = new Set(session.questionSnapshots.map((q: any) => q.questionId));
  const trulyNewSnapshots = newSnapshots.filter((q: any) => !existingIds.has(q.questionId));
  session.questionSnapshots.push(...(trulyNewSnapshots as any));
  const batchQuestionIds = Array.from(new Set(payload.questionIds));

  if (payload.autoPublishFirst) {
    const wasNotLive = session.status !== "live";
    if (wasNotLive) {
      await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
    }
    const firstIndex = session.questionSnapshots.findIndex((q: any) => q.questionId === batchQuestionIds[0]);
    session.status = "live";
    session.activeQuestionIndex = firstIndex >= 0 ? firstIndex : 0;
    session.publishedMode = "batch";
    session.publishedQuestionIds = batchQuestionIds;
    emitClassroomEvent(sessionId(session), "question:published", { activeQuestionIndex: session.activeQuestionIndex, publishedMode: "batch" });
    if (wasNotLive) {
      emitClassroomEventToClass(session.classId, "classroom:started", {
        sessionId: sessionId(session),
        schoolId: session.schoolId,
        classId: session.classId,
        className: session.className,
        teacherName: req.authUser!.name || "معلم المادة",
      });
    }
  }
  await session.save();

  res.json({
    appendedCount: trulyNewSnapshots.length,
    totalQuestions: session.questionSnapshots.length,
    activeQuestionIndex: session.activeQuestionIndex,
  });
}));

classroomRouter.get("/sessions/:id/aggregate", requireAuth, asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
  const isTeacher = req.authUser!.role === "admin" || String(session.teacherId) === req.authUser!.id;
  const isStudent = student?.role === "student" && String(student.schoolId) === String(session.schoolId) && (student.groupIds || []).map(String).includes(String(session.classId));
  
  // Also check if caller is an authorized supervisor
  let isSupervisor = false;
  if (req.authUser!.role === "supervisor") {
    const scope = await resolveClassroomSupervisorScope(req.authUser!);
    isSupervisor = scope.all || scope.schoolIds.includes(String(session.schoolId)) || scope.classIds.includes(String(session.classId));
  }

  if (!isTeacher && !isStudent && !isSupervisor) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  const responses = await ClassroomResponseModel.find({ sessionId: sessionId(session) }).lean();
  
  // Group responses by questionId for accurate per-question distribution
  const responsesByQuestion = new Map<string, any[]>();
  for (const resp of responses) {
    const qId = String(resp.questionId);
    const list = responsesByQuestion.get(qId) || [];
    list.push(resp);
    responsesByQuestion.set(qId, list);
  }

  const publishedSet = new Set(
    session.publishedQuestionIds && session.publishedQuestionIds.length > 0
      ? session.publishedQuestionIds
      : (typeof session.activeQuestionIndex === "number" && session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [])
  );

  // Build per-question detailed projections
  const questions = (session.questionSnapshots || [])
    .map((question: any, index: number) => {
      if (isStudent && session.status === "live" && !publishedSet.has(question.questionId)) {
        return null;
      }
      const qResponses = responsesByQuestion.get(String(question.questionId)) || [];
      const qDistribution = (isStudent && session.status === "live")
        ? {}
        : qResponses.reduce((summary: Record<string, number>, response: any) => {
            const key = String(response.selectedOptionIndex);
            summary[key] = (summary[key] || 0) + 1;
            return summary;
          }, {});
      const correctCount = qResponses.filter((r: any) => r.isCorrect).length;

      if (isTeacher || isSupervisor) {
        return {
          index,
          questionId: question.questionId,
          text: question.text,
          imageUrl: question.imageUrl || "",
          options: question.options,
          type: question.type,
          correctOptionIndex: question.correctOptionIndex,
          explanation: question.explanation || "",
          skillIds: question.skillIds || [],
          sectionId: question.sectionId || "",
          subject: question.subject || "",
          difficulty: question.difficulty || "Medium",
          responseCount: qResponses.length,
          distribution: qDistribution,
          correctCount,
        };
      }
      return {
        index,
        ...projectClassroomQuestionForStudent(question, true),
        responseCount: qResponses.length,
        distribution: qDistribution,
      };
    })
    .filter(Boolean);

  // Active question context for root distribution & live radar
  const reqQuestionId = typeof req.query.questionId === "string" ? req.query.questionId : null;
  const activeQuestion = (reqQuestionId
    ? session.questionSnapshots?.find((q: any) => q.questionId === reqQuestionId)
    : null)
    || (typeof session.activeQuestionIndex === "number" ? session.questionSnapshots?.[session.activeQuestionIndex] : null)
    || session.questionSnapshots?.[0]
    || null;

  const activeResponses = activeQuestion
    ? (responsesByQuestion.get(String(activeQuestion.questionId)) || [])
    : [];
  const activeDistribution = (isStudent && session.status === "live")
    ? {}
    : activeResponses.reduce((summary: Record<string, number>, response: any) => {
        const key = String(response.selectedOptionIndex);
        summary[key] = (summary[key] || 0) + 1;
        return summary;
      }, {});
  const activeCorrectCount = activeResponses.filter((r: any) => r.isCorrect).length;

  res.json({
    sessionId: sessionId(session),
    status: session.status,
    activeQuestionIndex: session.activeQuestionIndex,
    activeQuestionId: activeQuestion?.questionId || null,
    responseCount: activeResponses.length,
    distribution: activeDistribution,
    correctCount: (isTeacher || isSupervisor || session.status === "ended") ? activeCorrectCount : undefined,
    totalSessionResponses: responses.length,
    report: session.status === "ended" ? session.reportSnapshot : null,
    questions,
    meta: {
      day: session.day || "",
      period: session.period || null,
      subjectName: session.subjectName || "",
      className: session.className || "",
      publishedMode: session.publishedMode || "single",
    },
  });
}));
