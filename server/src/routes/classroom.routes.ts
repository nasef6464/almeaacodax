import { randomInt } from "node:crypto";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ClassroomParticipantModel } from "../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { GroupModel } from "../models/Group.js";
import { QuestionModel } from "../models/Question.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";
import { hasActiveSchoolRole } from "../modules/schools/application/schoolContextResolver.js";
import { emitClassroomEvent, emitClassroomEventToClass } from "../sockets/classroomEvents.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerClassroomAggregateRoutes } from "./classroom/registerClassroomAggregateRoutes.js";
import { registerClassroomStudentRoutes } from "./classroom/registerClassroomStudentRoutes.js";
import { registerClassroomSupervisorRoutes } from "./classroom/registerClassroomSupervisorRoutes.js";
import {
  classroomSessionId,
  hashClassroomPin,
  safelyClosePreviousLiveSessions,
} from "./classroom/classroomRouteSupport.js";

export const classroomRouter = Router();

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

const appendQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(1).max(20),
  autoPublishFirst: z.boolean().optional().default(false),
});

classroomRouter.post("/sessions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const payload = createSchema.parse(req.body);
  const entitlement = await resolveSchoolEntitlement(payload.schoolId, "SMART_CLASSROOM");
  if (!entitlement.allowed) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
  }

  const classroom = Types.ObjectId.isValid(payload.classId)
    ? await GroupModel.exists({ _id: payload.classId, type: "CLASS", parentId: payload.schoolId })
    : null;
  if (!classroom) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Class does not belong to this school" });

  if (req.authUser!.role !== "admin") {
    const [hasTeacherContext, assigned] = await Promise.all([
      hasActiveSchoolRole(req.authUser!, payload.schoolId, "teacher"),
      TeachingAssignmentModel.exists({
        schoolId: payload.schoolId,
        teacherId: req.authUser!.id,
        classId: payload.classId,
        status: "active",
      }),
    ]);
    if (!hasTeacherContext || !assigned) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school and class" });
    }
  }

  const objectIds = payload.questionIds.filter((id) => Types.ObjectId.isValid(id));
  const questions = await QuestionModel.find({
    $or: [
      { id: { $in: payload.questionIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
    type: { $in: ["mcq", "true_false"] },
    approvalStatus: "approved",
  }).lean();
  if (questions.length !== payload.questionIds.length) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Questions must be approved MCQ or true/false" });
  }

  const byId = new Map(questions.map((question: any) => [String(question.id || question._id), question]));
  const snapshots = payload.questionIds.map((id) => {
    const question: any = byId.get(id);
    return {
      questionId: id,
      text: question.text,
      imageUrl: question.imageUrl || "",
      options: question.options || [],
      type: question.type,
      correctOptionIndex: question.correctOptionIndex,
      skillIds: question.skillIds || [],
      explanation: question.explanation || "",
      sectionId: question.sectionId || "",
      subject: question.subject || "",
      difficulty: question.difficulty || "Medium",
    };
  });

  const pin = String(randomInt(100000, 1000000));
  const initialStatus = payload.autoStart ? "live" : "draft";
  const activeQuestionIndex = payload.autoStart ? 0 : null;
  const initialPublished = payload.autoStart
    ? (payload.publishedMode === "batch" ? payload.questionIds : [payload.questionIds[0]])
    : [];

  if (initialStatus === "live") {
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
    activeQuestionIndex,
    questionSnapshots: snapshots,
    pinHash: hashClassroomPin(pin),
    pinExpiresAt: new Date(Date.now() + 30 * 60_000),
  });

  if (session.status === "live") {
    emitClassroomEventToClass(payload.classId, "classroom:started", {
      sessionId: classroomSessionId(session),
      schoolId: session.schoolId,
      classId: session.classId,
      className: session.className,
      teacherName: req.authUser!.name || "معلم المادة",
    });
  }

  res.status(StatusCodes.CREATED).json({
    sessionId: classroomSessionId(session),
    pin,
    status: session.status,
  });
}));

classroomRouter.get("/questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const schoolId = z.string().min(1).parse(req.query.schoolId);
  if (req.authUser!.role !== "admin") {
    const assignments = await TeachingAssignmentModel.find({
      schoolId,
      teacherId: req.authUser!.id,
      status: "active",
    }).select("classId").lean();
    const assignedClassIds = assignments
      .map((assignment) => String(assignment.classId))
      .filter((id) => Types.ObjectId.isValid(id));
    const [hasTeacherContext, assigned] = await Promise.all([
      hasActiveSchoolRole(req.authUser!, schoolId, "teacher"),
      assignedClassIds.length
        ? GroupModel.exists({ _id: { $in: assignedClassIds }, type: "CLASS", parentId: schoolId })
        : null,
    ]);
    if (!hasTeacherContext || !assigned) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
    }
  }

  const filter: Record<string, any> = {
    type: { $in: ["mcq", "true_false"] },
    approvalStatus: "approved",
  };
  if (typeof req.query.pathId === "string" && req.query.pathId.trim()) filter.pathId = req.query.pathId.trim();
  if (typeof req.query.subject === "string" && req.query.subject.trim()) filter.subject = req.query.subject.trim();
  if (typeof req.query.sectionId === "string" && req.query.sectionId.trim()) filter.sectionId = req.query.sectionId.trim();
  if (typeof req.query.skillId === "string" && req.query.skillId.trim()) filter.skillIds = req.query.skillId.trim();
  if (typeof req.query.difficulty === "string" && req.query.difficulty.trim()) filter.difficulty = req.query.difficulty.trim();
  if (typeof req.query.search === "string" && req.query.search.trim()) {
    filter.text = { $regex: req.query.search.trim(), $options: "i" };
  }

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
    await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
  }

  const targetQuestion = session.questionSnapshots[index];
  session.status = "live";
  session.activeQuestionIndex = index;
  if (session.publishedMode === "batch") {
    if (!session.publishedQuestionIds.includes(targetQuestion.questionId)) {
      session.publishedQuestionIds.push(targetQuestion.questionId);
    }
  } else {
    session.publishedMode = "single";
    session.publishedQuestionIds = [targetQuestion.questionId];
  }

  await session.save();
  emitClassroomEvent(classroomSessionId(session), "question:published", {
    activeQuestionIndex: index,
    questionId: targetQuestion.questionId,
  });
  if (wasNotLive) {
    emitClassroomEventToClass(session.classId, "classroom:started", {
      sessionId: classroomSessionId(session),
      schoolId: session.schoolId,
      classId: session.classId,
      className: session.className,
      teacherName: req.authUser!.name || "معلم المادة",
    });
  }
  res.json({ status: session.status, activeQuestionIndex: index });
}));

classroomRouter.post("/sessions/:id/end", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
  const session = await ClassroomSessionModel.findById(req.params.id);
  if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
  if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
  }
  if (session.status === "ended") return res.json({ report: session.reportSnapshot, alreadyEnded: true });

  const responses = await ClassroomResponseModel.find({ sessionId: classroomSessionId(session) }).lean();
  const participants = await ClassroomParticipantModel.countDocuments({ sessionId: classroomSessionId(session) });
  const report = {
    sessionId: classroomSessionId(session),
    schoolId: session.schoolId,
    classId: session.classId,
    participantCount: participants,
    responseCount: responses.length,
    correctCount: responses.filter((response: any) => response.isCorrect).length,
    endedAt: new Date().toISOString(),
  };

  session.status = "ended";
  session.endedAt = new Date();
  session.activeQuestionIndex = null;
  session.reportSnapshot = report;
  await session.save();
  emitClassroomEvent(classroomSessionId(session), "session:ended", { report });
  emitClassroomEventToClass(session.classId, "session:ended", { sessionId: classroomSessionId(session) });
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
    $or: [
      { id: { $in: payload.questionIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
    type: { $in: ["mcq", "true_false"] },
    approvalStatus: "approved",
  }).lean();
  const byId = new Map(questions.map((question: any) => [String(question.id || question._id), question]));
  const newSnapshots = payload.questionIds
    .map((id) => {
      const question: any = byId.get(id);
      if (!question) return null;
      return {
        questionId: id,
        text: question.text,
        imageUrl: question.imageUrl || "",
        options: question.options || [],
        type: question.type,
        correctOptionIndex: question.correctOptionIndex,
        skillIds: question.skillIds || [],
        explanation: question.explanation || "",
        sectionId: question.sectionId || "",
        subject: question.subject || "",
        difficulty: question.difficulty || "Medium",
      };
    })
    .filter(Boolean);

  if (newSnapshots.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "لم يتم العثور على أسئلة معتمدة صالحة للإضافة" });
  }

  const existingIds = new Set(session.questionSnapshots.map((question: any) => question.questionId));
  const trulyNewSnapshots = newSnapshots.filter((question: any) => !existingIds.has(question.questionId));
  session.questionSnapshots.push(...(trulyNewSnapshots as any));
  const batchQuestionIds = Array.from(new Set(payload.questionIds));

  if (payload.autoPublishFirst) {
    const wasNotLive = session.status !== "live";
    if (wasNotLive) {
      await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
    }
    const firstIndex = session.questionSnapshots.findIndex((question: any) => question.questionId === batchQuestionIds[0]);
    session.status = "live";
    session.activeQuestionIndex = firstIndex >= 0 ? firstIndex : 0;
    session.publishedMode = "batch";
    session.publishedQuestionIds = batchQuestionIds;
    emitClassroomEvent(classroomSessionId(session), "question:published", {
      activeQuestionIndex: session.activeQuestionIndex,
      publishedMode: "batch",
    });
    if (wasNotLive) {
      emitClassroomEventToClass(session.classId, "classroom:started", {
        sessionId: classroomSessionId(session),
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

registerClassroomStudentRoutes(classroomRouter);
registerClassroomSupervisorRoutes(classroomRouter);
registerClassroomAggregateRoutes(classroomRouter);
