import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../../middleware/auth.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { UserModel } from "../../models/User.js";
import { projectClassroomQuestionForStudent } from "../../modules/schools/application/classroomQuestionProjection.js";
import { resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId } from "./classroomRouteSupport.js";

export function registerClassroomAggregateRoutes(classroomRouter: Router) {
  classroomRouter.get("/sessions/:id/aggregate", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    const isTeacher = req.authUser!.role === "admin" || String(session.teacherId) === req.authUser!.id;
    const isStudentInClass = student?.role === "student"
      && String(student.schoolId) === String(session.schoolId)
      && (student.groupIds || []).map(String).includes(String(session.classId));
    const isStudent = isStudentInClass
      ? Boolean(await ClassroomParticipantModel.exists({ sessionId: classroomSessionId(session), studentId: req.authUser!.id }))
      : false;

    let isSupervisor = false;
    if (req.authUser!.role === "supervisor") {
      const scope = await resolveClassroomSupervisorScope(req.authUser!);
      isSupervisor = scope.all || scope.schoolIds.includes(String(session.schoolId)) || scope.classIds.includes(String(session.classId));
    }
    let isDirector = false;
    if (req.authUser!.role === "school_admin") {
      isDirector = Boolean(await requireSchoolDirectorCapability(
        req.authUser!.id, String(session.schoolId), "SCHOOL_SMART_CLASSROOM_VIEW", "SMART_CLASSROOM",
      ));
    }
    const isStaff = isTeacher || isSupervisor || isDirector;
    if (!isStaff && !isStudent) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });

    const responses = await ClassroomResponseModel.find({ sessionId: classroomSessionId(session) }).lean();
    const responsesByQuestion = new Map<string, any[]>();
    for (const response of responses) {
      const questionId = String(response.questionId); const list = responsesByQuestion.get(questionId) || [];
      list.push(response); responsesByQuestion.set(questionId, list);
    }
    const publishedSet = new Set(session.publishedQuestionIds?.length
      ? session.publishedQuestionIds
      : typeof session.activeQuestionIndex === "number" && session.questionSnapshots[session.activeQuestionIndex]
        ? [session.questionSnapshots[session.activeQuestionIndex].questionId] : []);

    const questions = (session.questionSnapshots || []).map((question: any, index: number) => {
      if (isStudent && session.status === "live" && !publishedSet.has(question.questionId)) return null;
      const questionResponses = responsesByQuestion.get(String(question.questionId)) || [];
      const distribution = isStudent && session.status === "live" ? {} : questionResponses.reduce((summary: Record<string, number>, response: any) => {
        const key = String(response.selectedOptionIndex); summary[key] = (summary[key] || 0) + 1; return summary;
      }, {});
      const correctCount = questionResponses.filter((response: any) => response.isCorrect).length;
      if (isStaff) return {
        index, questionId: question.questionId, text: question.text, imageUrl: question.imageUrl || "", options: question.options,
        type: question.type, correctOptionIndex: question.correctOptionIndex, explanation: question.explanation || "",
        skillIds: question.skillIds || [], pathId: question.pathId || "", sectionId: question.sectionId || "",
        subject: question.subject || "", difficulty: question.difficulty || "Medium", responseCount: questionResponses.length,
        distribution, correctCount,
      };
      return { index, ...projectClassroomQuestionForStudent(question, true), responseCount: questionResponses.length, distribution };
    }).filter(Boolean);

    const requestedQuestionId = typeof req.query.questionId === "string" ? req.query.questionId : null;
    const activeQuestion = (requestedQuestionId ? session.questionSnapshots?.find((question: any) => String(question.questionId) === requestedQuestionId) : null)
      || (typeof session.activeQuestionIndex === "number" ? session.questionSnapshots?.[session.activeQuestionIndex] : null)
      || session.questionSnapshots?.[0] || null;
    const activeResponses = activeQuestion ? (responsesByQuestion.get(String(activeQuestion.questionId)) || []) : [];
    const activeDistribution = isStudent && session.status === "live" ? {} : activeResponses.reduce((summary: Record<string, number>, response: any) => {
      const key = String(response.selectedOptionIndex); summary[key] = (summary[key] || 0) + 1; return summary;
    }, {});
    const activeCorrectCount = activeResponses.filter((response: any) => response.isCorrect).length;
    const batches = isStaff ? (session.questionBatches || []).map((batch: any, index: number) => ({
      batchId: String(batch.batchId || ""),
      number: index + 1,
      label: batch.label || `الدفعة ${index + 1}`,
      questionIds: (batch.questionIds || []).map(String),
      startedAt: batch.startedAt || null,
      endedAt: batch.endedAt || null,
      active: Boolean(session.activeBatchId) && String(session.activeBatchId) === String(batch.batchId),
    })) : undefined;

    res.json({
      sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId, status: session.status, activeQuestionIndex: session.activeQuestionIndex,
      activeQuestionId: activeQuestion?.questionId || null, activeBatchId: isStaff ? session.activeBatchId || "" : undefined,
      responseCount: activeResponses.length, distribution: activeDistribution,
      correctCount: isStaff || session.status === "ended" ? activeCorrectCount : undefined,
      totalSessionResponses: responses.length, report: session.status === "ended" ? session.reportSnapshot : null, questions, batches,
      meta: { schoolId: session.schoolId, classId: session.classId, day: session.day || "", period: session.period || null, subjectName: session.subjectName || "", className: session.className || "", publishedMode: session.publishedMode || "single" },
    });
  }));
}
