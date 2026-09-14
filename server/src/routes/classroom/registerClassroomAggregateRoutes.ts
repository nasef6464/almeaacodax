import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { requireAuth } from "../../middleware/auth.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../../models/TeachingAssignment.js";
import { UserModel } from "../../models/User.js";
import { resolveClassroomSupervisorScope } from "../../modules/schools/application/classroomSupervisorReport.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { requireSchoolDirectorCapability } from "../../modules/schools/application/schoolDirectorAccess.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, ensureTeacherSchoolAccess } from "./classroomRouteSupport.js";

const submissionKeyForSession = (session: any) => {
  if (session.publishedMode === "batch" && session.activeBatchId) return `batch:${String(session.activeBatchId)}`;
  const ids = Array.isArray(session.publishedQuestionIds) ? session.publishedQuestionIds.map(String).sort() : [];
  return `questions:${ids.join("|")}`;
};

export function registerClassroomAggregateRoutes(classroomRouter: Router) {
  classroomRouter.get("/sessions/:id/aggregate", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });

    if (req.authUser!.role !== "admin" && !(await resolveSchoolEntitlement(String(session.schoolId), "SMART_CLASSROOM")).allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    }

    let isTeacher = req.authUser!.role === "admin";
    if (!isTeacher && req.authUser!.role === "teacher" && String(session.teacherId) === req.authUser!.id) {
      const [hasSchoolAccess, hasClassAssignment] = await Promise.all([
        ensureTeacherSchoolAccess(req.authUser!, String(session.schoolId)),
        TeachingAssignmentModel.exists({
          schoolId: String(session.schoolId),
          classId: String(session.classId),
          teacherId: req.authUser!.id,
          status: "active",
        }),
      ]);
      isTeacher = Boolean(hasSchoolAccess && hasClassAssignment);
    }

    let isSupervisor = false;
    if (req.authUser!.role === "supervisor") {
      const scope = await resolveClassroomSupervisorScope(req.authUser!);
      isSupervisor = scope.all || scope.schoolIds.includes(String(session.schoolId)) || scope.classIds.includes(String(session.classId));
    }

    let isDirector = false;
    if (req.authUser!.role === "school_admin") {
      isDirector = Boolean(await requireSchoolDirectorCapability(
        req.authUser!.id,
        String(session.schoolId),
        "SCHOOL_SMART_CLASSROOM_VIEW",
        "SMART_CLASSROOM",
      ));
    }

    const isStaff = isTeacher || isSupervisor || isDirector;
    if (!isStaff) return res.status(StatusCodes.FORBIDDEN).json({ message: "Classroom analytics are staff-only" });

    const sessionId = classroomSessionId(session);
    if (req.query.view === "live") {
      const activeQuestion = typeof session.activeQuestionIndex === "number"
        ? session.questionSnapshots?.[session.activeQuestionIndex]
        : null;
      const questionId = activeQuestion ? String(activeQuestion.questionId) : "";
      const [distributionRows, joinedCount] = await Promise.all([
        questionId
          ? ClassroomResponseModel.aggregate([
              { $match: { sessionId, questionId } },
              { $group: { _id: "$selectedOptionIndex", count: { $sum: 1 }, correct: { $sum: { $cond: ["$isCorrect", 1, 0] } } } },
            ])
          : Promise.resolve([]),
        ClassroomParticipantModel.countDocuments({ sessionId }),
      ]);
      const distribution = (distributionRows as Array<{ _id: number; count: number }>).reduce((summary, row) => {
        summary[String(row._id)] = row.count;
        return summary;
      }, {} as Record<string, number>);
      const responseCount = (distributionRows as Array<{ count: number }>).reduce((total, row) => total + row.count, 0);
      const correctCount = (distributionRows as Array<{ correct: number }>).reduce((total, row) => total + row.correct, 0);
      return res.json({
        sessionId,
        status: session.status,
        activeQuestionIndex: session.activeQuestionIndex,
        activeBatchId: session.activeBatchId || "",
        questionId,
        responseCount,
        correctCount,
        distribution,
        joinedCount,
      });
    }
    const [responses, participants] = await Promise.all([
      ClassroomResponseModel.find({ sessionId }).lean(),
      ClassroomParticipantModel.find({ sessionId }).select("studentId joinedAt finalizedSubmissionKeys").lean() as any,
    ]);

    const responsesByQuestion = new Map<string, any[]>();
    for (const response of responses) {
      const questionId = String(response.questionId);
      const list = responsesByQuestion.get(questionId) || [];
      list.push(response);
      responsesByQuestion.set(questionId, list);
    }

    const questions = (session.questionSnapshots || []).map((question: any, index: number) => {
      const questionResponses = responsesByQuestion.get(String(question.questionId)) || [];
      const distribution = questionResponses.reduce((summary: Record<string, number>, response: any) => {
        const key = String(response.selectedOptionIndex);
        summary[key] = (summary[key] || 0) + 1;
        return summary;
      }, {});
      const correctCount = questionResponses.filter((response: any) => response.isCorrect).length;
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
        pathId: question.pathId || "",
        sectionId: question.sectionId || "",
        subject: question.subject || "",
        difficulty: question.difficulty || "Medium",
        responseCount: questionResponses.length,
        distribution,
        correctCount,
      };
    });

    const requestedQuestionId = typeof req.query.questionId === "string" ? req.query.questionId : null;
    const activeQuestion = (requestedQuestionId
      ? session.questionSnapshots?.find((question: any) => String(question.questionId) === requestedQuestionId)
      : null)
      || (typeof session.activeQuestionIndex === "number" ? session.questionSnapshots?.[session.activeQuestionIndex] : null)
      || session.questionSnapshots?.[0]
      || null;
    const activeResponses = activeQuestion ? (responsesByQuestion.get(String(activeQuestion.questionId)) || []) : [];
    const activeDistribution = activeResponses.reduce((summary: Record<string, number>, response: any) => {
      const key = String(response.selectedOptionIndex);
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});
    const activeCorrectCount = activeResponses.filter((response: any) => response.isCorrect).length;
    const batches = (session.questionBatches || []).map((batch: any, index: number) => ({
      batchId: String(batch.batchId || ""),
      number: index + 1,
      label: batch.label || `الدفعة ${index + 1}`,
      questionIds: (batch.questionIds || []).map(String),
      startedAt: batch.startedAt || null,
      endedAt: batch.endedAt || null,
      active: Boolean(session.activeBatchId) && String(session.activeBatchId) === String(batch.batchId),
    }));

    const submissionKey = submissionKeyForSession(session);
    const submittedParticipants = participants.filter((participant: any) =>
      (participant.finalizedSubmissionKeys || []).map(String).includes(submissionKey),
    );
    const submittedStudentIds = submittedParticipants.map((participant: any) => String(participant.studentId));
    const objectIds = submittedStudentIds.filter((studentId: string) => Types.ObjectId.isValid(studentId));
    const submittedUsers = submittedStudentIds.length > 0
      ? await UserModel.find({
          $or: [
            { id: { $in: submittedStudentIds } },
            ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
          ],
        }).select("id _id name displayName").lean() as any[]
      : [];
    const nameByStudentId = new Map<string, string>();
    submittedUsers.forEach((student: any) => {
      const name = String(student.displayName || student.name || "طالب");
      if (student.id) nameByStudentId.set(String(student.id), name);
      if (student._id) nameByStudentId.set(String(student._id), name);
    });

    const activeBatch = (session.questionBatches || []).find((batch: any) => String(batch.batchId) === String(session.activeBatchId || ""));
    const activeBatchQuestionIds = new Set((activeBatch?.questionIds || session.publishedQuestionIds || []).map(String));
    const timerEndsAt = activeBatch?.timerEndsAt ? new Date(activeBatch.timerEndsAt) : null;
    const submitted = submittedParticipants.map((participant: any) => {
      const studentId = String(participant.studentId);
      const studentResponses = responses.filter((response: any) =>
        String(response.studentId) === studentId && activeBatchQuestionIds.has(String(response.questionId)),
      );
      const latestResponseAt = studentResponses
        .map((response: any) => response.submittedAt ? new Date(response.submittedAt) : null)
        .filter(Boolean)
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0] || null;
      return {
        studentId,
        name: nameByStudentId.get(studentId) || "طالب",
        submittedAt: latestResponseAt,
        onTime: timerEndsAt && latestResponseAt ? latestResponseAt.getTime() <= timerEndsAt.getTime() : null,
      };
    });

    res.json({
      sessionId,
      schoolId: session.schoolId,
      classId: session.classId,
      status: session.status,
      activeQuestionIndex: session.activeQuestionIndex,
      activeQuestionId: activeQuestion?.questionId || null,
      activeBatchId: session.activeBatchId || "",
      responseCount: activeResponses.length,
      distribution: activeDistribution,
      correctCount: activeCorrectCount,
      totalSessionResponses: responses.length,
      report: session.status === "ended" ? session.reportSnapshot : null,
      questions,
      batches,
      submissionSummary: {
        submissionKey,
        joinedCount: participants.length,
        submittedCount: submitted.length,
        submitted,
      },
      meta: {
        schoolId: session.schoolId,
        classId: session.classId,
        day: session.day || "",
        period: session.period || null,
        subjectName: session.subjectName || "",
        className: session.className || "",
        publishedMode: session.publishedMode || "single",
      },
    });
  }));
}
