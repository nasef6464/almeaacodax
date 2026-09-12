import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { requireAuth } from "../../middleware/auth.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { UserModel } from "../../models/User.js";
import { projectClassroomQuestionForStudent } from "../../modules/schools/application/classroomQuestionProjection.js";
import { resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId } from "./classroomRouteSupport.js";

export function registerClassroomAggregateRoutes(classroomRouter: Router) {
  classroomRouter.get("/sessions/:id/aggregate", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    const isTeacher = req.authUser!.role === "admin" || String(session.teacherId) === req.authUser!.id;
    const isStudent = student?.role === "student"
      && String(student.schoolId) === String(session.schoolId)
      && (student.groupIds || []).map(String).includes(String(session.classId));

    let isSupervisor = false;
    if (req.authUser!.role === "supervisor") {
      const scope = await resolveClassroomSupervisorScope(req.authUser!);
      isSupervisor = scope.all
        || scope.schoolIds.includes(String(session.schoolId))
        || scope.classIds.includes(String(session.classId));
    }

    if (!isTeacher && !isStudent && !isSupervisor) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    }

    const responses = await ClassroomResponseModel.find({ sessionId: classroomSessionId(session) }).lean();
    const responsesByQuestion = new Map<string, any[]>();
    for (const response of responses) {
      const questionId = String(response.questionId);
      const list = responsesByQuestion.get(questionId) || [];
      list.push(response);
      responsesByQuestion.set(questionId, list);
    }

    const publishedSet = new Set(
      session.publishedQuestionIds?.length
        ? session.publishedQuestionIds
        : typeof session.activeQuestionIndex === "number" && session.questionSnapshots[session.activeQuestionIndex]
          ? [session.questionSnapshots[session.activeQuestionIndex].questionId]
          : [],
    );

    const questions = (session.questionSnapshots || [])
      .map((question: any, index: number) => {
        if (isStudent && session.status === "live" && !publishedSet.has(question.questionId)) return null;

        const questionResponses = responsesByQuestion.get(String(question.questionId)) || [];
        const distribution = isStudent && session.status === "live"
          ? {}
          : questionResponses.reduce((summary: Record<string, number>, response: any) => {
              const key = String(response.selectedOptionIndex);
              summary[key] = (summary[key] || 0) + 1;
              return summary;
            }, {});
        const correctCount = questionResponses.filter((response: any) => response.isCorrect).length;

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
            responseCount: questionResponses.length,
            distribution,
            correctCount,
          };
        }

        return {
          index,
          ...projectClassroomQuestionForStudent(question, true),
          responseCount: questionResponses.length,
          distribution,
        };
      })
      .filter(Boolean);

    const requestedQuestionId = typeof req.query.questionId === "string" ? req.query.questionId : null;
    const activeQuestion = (requestedQuestionId
      ? session.questionSnapshots?.find((question: any) => question.questionId === requestedQuestionId)
      : null)
      || (typeof session.activeQuestionIndex === "number" ? session.questionSnapshots?.[session.activeQuestionIndex] : null)
      || session.questionSnapshots?.[0]
      || null;

    const activeResponses = activeQuestion
      ? (responsesByQuestion.get(String(activeQuestion.questionId)) || [])
      : [];
    const activeDistribution = isStudent && session.status === "live"
      ? {}
      : activeResponses.reduce((summary: Record<string, number>, response: any) => {
          const key = String(response.selectedOptionIndex);
          summary[key] = (summary[key] || 0) + 1;
          return summary;
        }, {});
    const activeCorrectCount = activeResponses.filter((response: any) => response.isCorrect).length;

    res.json({
      sessionId: classroomSessionId(session),
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
}
