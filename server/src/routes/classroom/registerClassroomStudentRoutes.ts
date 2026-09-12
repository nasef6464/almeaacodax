import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { sensitiveActionRateLimiter } from "../../middleware/rateLimiters.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { GroupModel } from "../../models/Group.js";
import { UserModel } from "../../models/User.js";
import { projectClassroomQuestionForStudent } from "../../modules/schools/application/classroomQuestionProjection.js";
import { emitClassroomEvent } from "../../sockets/classroomEvents.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, hashClassroomPin } from "./classroomRouteSupport.js";

const joinSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });
const answerSchema = z.object({ selectedOptionIndex: z.number().int().min(0) });

const studentCanAccessSession = (student: any, session: any) =>
  !!student
  && student.role === "student"
  && String(student.schoolId) === String(session.schoolId)
  && (student.groupIds || []).map(String).includes(String(session.classId));

export function registerClassroomStudentRoutes(classroomRouter: Router) {
  classroomRouter.get("/student/active-session", requireAuth, asyncHandler(async (req, res) => {
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role name").lean() as any;
    if (!student || student.role !== "student" || !student.schoolId) return res.json({ hasActiveSession: false });

    const studentClassIds = (student.groupIds || []).map(String).filter((id: string) => id.length > 0);
    if (studentClassIds.length === 0) return res.json({ hasActiveSession: false });

    const session = await ClassroomSessionModel.findOne({
      schoolId: String(student.schoolId),
      classId: { $in: studentClassIds },
      status: { $in: ["live", "scheduled"] },
      pinExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean() as any;

    if (!session) return res.json({ hasActiveSession: false });

    const [teacher, classroomGroup] = await Promise.all([
      UserModel.findById(session.teacherId).select("name displayName email").lean() as any,
      GroupModel.findById(session.classId).select("name").lean() as any,
    ]);

    res.json({
      hasActiveSession: true,
      session: {
        sessionId: classroomSessionId(session),
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

  classroomRouter.post("/sessions/join-by-pin", sensitiveActionRateLimiter, requireAuth, asyncHandler(async (req, res) => {
    const payload = joinSchema.parse(req.body);
    const session = await ClassroomSessionModel.findOne({
      pinHash: hashClassroomPin(payload.pin),
      status: { $in: ["live", "scheduled", "draft"] },
      pinExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 }).lean() as any;

    if (!session) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "لم يتم العثور على حصة نشطة بهذا الرمز أو قد انتهت صلاحيته." });
    }

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!studentCanAccessSession(student, session)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الرمز مخصص لحصة فصل دراسي آخر أو مدرسة أخرى." });
    }

    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true },
    );

    res.json({ joined: true, sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId });
  }));

  classroomRouter.post("/sessions/:id/instant-join", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status === "ended") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "الحصة غير نشطة أو انتهت" });
    }

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!studentCanAccessSession(student, session)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "غير مصرح لك بالانضمام لهذه الحصة المخصصة لفصل آخر" });
    }

    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true },
    );
    res.json({ joined: true, sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId });
  }));

  classroomRouter.post("/sessions/:id/join", requireAuth, asyncHandler(async (req, res) => {
    const payload = joinSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status === "ended" || session.pinExpiresAt < new Date() || hashClassroomPin(payload.pin) !== session.pinHash) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
    }

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!studentCanAccessSession(student, session)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    }

    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } },
      { upsert: true },
    );
    res.json({ joined: true, sessionId: classroomSessionId(session) });
  }));

  classroomRouter.get("/sessions/:id/current", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No active question" });
    }

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!studentCanAccessSession(student, session)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    }

    const participant = await ClassroomParticipantModel.exists({ sessionId: classroomSessionId(session), studentId: req.authUser!.id });
    if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before viewing questions" });

    const publishedSet = new Set(
      session.publishedQuestionIds?.length
        ? session.publishedQuestionIds
        : session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [],
    );

    const safeQuestions = session.questionSnapshots
      .map((question: any, index: number) => ({ index, raw: question }))
      .filter((item: any) => publishedSet.has(item.raw.questionId))
      .map((item: any) => ({ index: item.index, ...projectClassroomQuestionForStudent(item.raw, true) }));

    const currentQuestion = safeQuestions.find((question: any) => question.index === session.activeQuestionIndex) || safeQuestions[0] || null;
    const batchPosition = safeQuestions.findIndex((question: any) => question.index === session.activeQuestionIndex);
    res.json({
      sessionId: classroomSessionId(session),
      question: currentQuestion,
      currentIndex: batchPosition >= 0 ? batchPosition : 0,
      globalIndex: session.activeQuestionIndex,
      totalQuestions: safeQuestions.length,
      questions: safeQuestions,
    });
  }));

  classroomRouter.put("/sessions/:id/answers/:questionId", requireAuth, asyncHandler(async (req, res) => {
    const payload = answerSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
    }

    const publishedSet = new Set(
      session.publishedQuestionIds?.length
        ? session.publishedQuestionIds
        : session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [],
    );
    if (!publishedSet.has(req.params.questionId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "السؤال غير متاح للإجابة حالياً" });
    }

    const question = session.questionSnapshots.find((item: any) => String(item.questionId) === req.params.questionId)
      || session.questionSnapshots[session.activeQuestionIndex];
    if (!question) return res.status(StatusCodes.CONFLICT).json({ message: "Question is not active" });

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!studentCanAccessSession(student, session)) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    }

    const participant = await ClassroomParticipantModel.exists({ sessionId: classroomSessionId(session), studentId: req.authUser!.id });
    if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before answering" });
    if (payload.selectedOptionIndex >= question.options.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Selected option is invalid" });
    }

    const response = await ClassroomResponseModel.findOneAndUpdate(
      { sessionId: classroomSessionId(session), questionId: question.questionId, studentId: req.authUser!.id },
      { $set: { selectedOptionIndex: payload.selectedOptionIndex, isCorrect: payload.selectedOptionIndex === question.correctOptionIndex, updatedAt: new Date() } },
      { upsert: true, new: true },
    );
    const responseCount = await ClassroomResponseModel.countDocuments({ sessionId: classroomSessionId(session), questionId: question.questionId });
    emitClassroomEvent(classroomSessionId(session), "response:updated", { responseCount, questionId: question.questionId });
    res.json({ accepted: true, responseId: String(response._id) });
  }));
}
