import { randomInt } from "node:crypto";
import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { GroupModel } from "../../models/Group.js";
import { QuestionModel } from "../../models/Question.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { classroomQuestionVisibilityFilter, normalizeQuestionIds } from "../../modules/schools/application/classroomQuestionAccess.js";
import { canMutateClassroomQuestions, canPublishClassroom, isDuplicateLiveSessionError, type ClassroomSessionStatus } from "../../modules/schools/application/classroomLifecycle.js";
import { emitClassroomEvent, emitClassroomEventToClass } from "../../sockets/classroomEvents.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  classroomSessionId,
  ensureTeacherSchoolAccess,
  finalizeClassroomSession,
  hashClassroomPin,
  loadApprovedVisibleQuestions,
  safelyClosePreviousLiveSessions,
} from "./classroomRouteSupport.js";

const createSchema = z.object({
  schoolId: z.string().min(1),
  classId: z.string().min(1),
  questionIds: z.array(z.string().min(1)).max(30).refine((ids) => new Set(ids).size === ids.length, "Question IDs must be unique").optional().default([]),
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

export function registerClassroomTeacherRoutes(classroomRouter: Router) {
  classroomRouter.get("/teacher/active-session", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const schoolId = typeof req.query.schoolId === "string" && req.query.schoolId.trim() ? req.query.schoolId.trim() : undefined;
    if (req.authUser!.role === "teacher") {
      if (!schoolId) return res.status(StatusCodes.BAD_REQUEST).json({ message: "schoolId is required for teacher active session lookup" });
      if (!(await ensureTeacherSchoolAccess(req.authUser!, schoolId))) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
      }
      const entitlement = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
      if (!entitlement.allowed) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }
    const query: Record<string, any> = { teacherId: req.authUser!.id, status: "live" };
    if (schoolId) query.schoolId = schoolId;
    const session = await ClassroomSessionModel.findOne(query).sort({ createdAt: -1 }).lean() as any;
    if (!session) return res.json({ hasActiveSession: false });
    const classroomGroup = await GroupModel.findById(session.classId).select("name").lean() as any;
    res.json({
      hasActiveSession: true,
      session: {
        sessionId: classroomSessionId(session),
        schoolId: session.schoolId,
        classId: session.classId,
        className: classroomGroup?.name || session.className || "فصل دراسي",
        status: session.status,
        activeQuestionIndex: session.activeQuestionIndex,
        totalQuestions: session.questionSnapshots?.length || 0,
        createdAt: session.createdAt,
      },
    });
  }));

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
        ensureTeacherSchoolAccess(req.authUser!, payload.schoolId),
        TeachingAssignmentModel.exists({ schoolId: payload.schoolId, teacherId: req.authUser!.id, classId: payload.classId, status: "active" }),
      ]);
      if (!hasTeacherContext || !assigned) return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school and class" });
    }

    const snapshots = payload.questionIds.length > 0
      ? await loadApprovedVisibleQuestions(payload.questionIds, payload.schoolId, req.authUser!.id)
      : [];
    if (!snapshots || snapshots.length !== payload.questionIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Questions must be approved, visible to this school, and valid for Smart Classroom" });
    }

    const pin = String(randomInt(100000, 1000000));
    const initialStatus = payload.autoStart ? "live" : "draft";
    const canonicalQuestionIds = snapshots.map((question) => question.questionId);
    const initialPublished = payload.autoStart && canonicalQuestionIds.length > 0
      ? (payload.publishedMode === "batch" ? canonicalQuestionIds : [canonicalQuestionIds[0]])
      : [];
    if (initialStatus === "live") await safelyClosePreviousLiveSessions(payload.schoolId, payload.classId);

    try {
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
        activeQuestionIndex: payload.autoStart && canonicalQuestionIds.length > 0 ? 0 : null,
        questionSnapshots: snapshots,
        pinHash: hashClassroomPin(pin),
        pinExpiresAt: new Date(Date.now() + 30 * 60_000),
      });
      if (session.status === "live") {
        emitClassroomEventToClass(payload.classId, "classroom:started", {
          sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId,
          className: session.className, teacherName: req.authUser!.name || "معلم المادة",
        });
      }
      return res.status(StatusCodes.CREATED).json({ sessionId: classroomSessionId(session), pin, status: session.status });
    } catch (error) {
      if (isDuplicateLiveSessionError(error)) return res.status(StatusCodes.CONFLICT).json({ message: "يوجد بالفعل فصل ذكي مباشر لهذا الفصل الدراسي" });
      throw error;
    }
  }));

  classroomRouter.get("/questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const schoolId = z.string().min(1).parse(req.query.schoolId);
    if (!(await ensureTeacherSchoolAccess(req.authUser!, schoolId))) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Teacher is not assigned to this school" });
    }
    const filter: Record<string, any> = { $and: [
      { type: { $in: ["mcq", "true_false"] } },
      { approvalStatus: "approved" },
      classroomQuestionVisibilityFilter(schoolId, req.authUser!.id),
    ] };
    if (typeof req.query.pathId === "string" && req.query.pathId.trim()) filter.$and.push({ pathId: req.query.pathId.trim() });
    if (typeof req.query.subject === "string" && req.query.subject.trim()) filter.$and.push({ subject: req.query.subject.trim() });
    if (typeof req.query.sectionId === "string" && req.query.sectionId.trim()) filter.$and.push({ sectionId: req.query.sectionId.trim() });
    if (typeof req.query.skillId === "string" && req.query.skillId.trim()) filter.$and.push({ skillIds: req.query.skillId.trim() });
    if (typeof req.query.difficulty === "string" && req.query.difficulty.trim()) filter.$and.push({ difficulty: req.query.difficulty.trim() });
    if (typeof req.query.search === "string" && req.query.search.trim()) filter.$and.push({ text: { $regex: req.query.search.trim(), $options: "i" } });

    const questions = await QuestionModel.find(filter)
      .select("id text imageUrl options type skillIds pathId subject sectionId difficulty examType explanation ownerType ownerId")
      .sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ questions: questions.map((question: any) => ({
      questionId: String(question.id || question._id), text: question.text, imageUrl: question.imageUrl || "",
      options: question.options, type: question.type, skillIds: question.skillIds || [], pathId: question.pathId || "",
      subject: question.subject || "", sectionId: question.sectionId || "", difficulty: question.difficulty || "Medium",
      examType: question.examType || "general", explanation: question.explanation || "",
    })) });
  }));

  classroomRouter.post("/sessions/:id/publish/:index", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id);
    const index = Number(req.params.index);
    if (!session || !Number.isInteger(index) || index < 0 || index >= session.questionSnapshots.length) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Session or question not found" });
    }
    if (!canPublishClassroom(session.status as ClassroomSessionStatus)) return res.status(StatusCodes.CONFLICT).json({ message: "Session lifecycle does not allow publishing" });
    if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });

    const wasNotLive = session.status !== "live";
    if (wasNotLive) {
      await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
      session.pinExpiresAt = new Date(Date.now() + 30 * 60_000);
    }
    const targetQuestion = session.questionSnapshots[index];
    session.status = "live";
    session.activeQuestionIndex = index;
    if (session.publishedMode === "batch") {
      if (!session.publishedQuestionIds.includes(targetQuestion.questionId)) session.publishedQuestionIds.push(targetQuestion.questionId);
    } else {
      session.publishedMode = "single";
      session.publishedQuestionIds = [targetQuestion.questionId];
    }
    try { await session.save(); } catch (error) {
      if (isDuplicateLiveSessionError(error)) return res.status(StatusCodes.CONFLICT).json({ message: "يوجد بالفعل فصل ذكي مباشر لهذا الفصل الدراسي" });
      throw error;
    }
    emitClassroomEvent(classroomSessionId(session), "question:published", { activeQuestionIndex: index, questionId: targetQuestion.questionId });
    if (wasNotLive) emitClassroomEventToClass(session.classId, "classroom:started", {
      sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId,
      className: session.className, teacherName: req.authUser!.name || "معلم المادة",
    });
    res.json({ status: session.status, activeQuestionIndex: index });
  }));

  classroomRouter.post("/sessions/:id/end", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id);
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
    if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    if (session.status === "ended" && session.reportSnapshot) return res.json({ report: session.reportSnapshot, alreadyEnded: true });
    if (session.status === "archived") return res.status(StatusCodes.CONFLICT).json({ message: "Archived sessions cannot be ended again" });
    res.json({ report: await finalizeClassroomSession(session) });
  }));

  classroomRouter.post("/sessions/:id/append-questions", requireAuth, requireRole(["teacher", "admin"]), asyncHandler(async (req, res) => {
    const payload = appendQuestionsSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id);
    if (!session || !canMutateClassroomQuestions(session.status as ClassroomSessionStatus)) return res.status(StatusCodes.CONFLICT).json({ message: "الحصة لا تسمح بإضافة أسئلة في حالتها الحالية" });
    if (req.authUser!.role !== "admin" && String(session.teacherId) !== req.authUser!.id) return res.status(StatusCodes.FORBIDDEN).json({ message: "غير مصرح لك بتعديل هذه الحصة" });

    const requestedIds = normalizeQuestionIds(payload.questionIds);
    const snapshots = await loadApprovedVisibleQuestions(requestedIds, session.schoolId, req.authUser!.id);
    if (!snapshots || snapshots.length !== requestedIds.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "بعض الأسئلة غير موجودة أو غير معتمدة أو خارج نطاق المدرسة" });
    const existingIds = new Set(session.questionSnapshots.map((question: any) => String(question.questionId)));
    const trulyNewSnapshots = snapshots.filter((question: any) => !existingIds.has(String(question.questionId)));
    if (trulyNewSnapshots.length === 0) return res.status(StatusCodes.CONFLICT).json({ message: "كل الأسئلة المحددة موجودة بالفعل داخل الحصة" });

    session.questionSnapshots.push(...(trulyNewSnapshots as any));
    const newQuestionIds = trulyNewSnapshots.map((question: any) => String(question.questionId));
    const wasNotLive = payload.autoPublishFirst && session.status !== "live";
    if (payload.autoPublishFirst) {
      if (wasNotLive) {
        await safelyClosePreviousLiveSessions(session.schoolId, session.classId, String(session._id));
        session.pinExpiresAt = new Date(Date.now() + 30 * 60_000);
      }
      session.status = "live";
      session.activeQuestionIndex = session.questionSnapshots.findIndex((question: any) => String(question.questionId) === newQuestionIds[0]);
      session.publishedMode = "batch";
      session.publishedQuestionIds = newQuestionIds;
    }
    try { await session.save(); } catch (error) {
      if (isDuplicateLiveSessionError(error)) return res.status(StatusCodes.CONFLICT).json({ message: "يوجد بالفعل فصل ذكي مباشر لهذا الفصل الدراسي" });
      throw error;
    }
    if (payload.autoPublishFirst) {
      emitClassroomEvent(classroomSessionId(session), "question:published", {
        activeQuestionIndex: session.activeQuestionIndex, questionId: newQuestionIds[0], publishedMode: "batch", publishedQuestionIds: newQuestionIds,
      });
      if (wasNotLive) emitClassroomEventToClass(session.classId, "classroom:started", {
        sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId,
        className: session.className, teacherName: req.authUser!.name || "معلم المادة",
      });
    }
    res.json({ appendedCount: trulyNewSnapshots.length, publishedQuestionIds: payload.autoPublishFirst ? newQuestionIds : [], totalQuestions: session.questionSnapshots.length, activeQuestionIndex: session.activeQuestionIndex });
  }));
}
