import type { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { sensitiveActionRateLimiter } from "../../middleware/rateLimiters.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { GroupModel } from "../../models/Group.js";
import { UserModel } from "../../models/User.js";
import { canStudentJoinClassroom, type ClassroomSessionStatus } from "../../modules/schools/application/classroomLifecycle.js";
import { projectClassroomQuestionForStudent } from "../../modules/schools/application/classroomQuestionProjection.js";
import { resolveSchoolContexts } from "../../modules/schools/application/schoolContextResolver.js";
import { resolveSchoolEntitlement } from "../../modules/schools/application/schoolEntitlementResolver.js";
import { emitClassroomEvent } from "../../sockets/classroomEvents.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { classroomSessionId, hashClassroomPin } from "./classroomRouteSupport.js";

const joinSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });
const answerSchema = z.object({ selectedOptionIndex: z.number().int().min(0) });
const finalSubmitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedOptionIndex: z.number().int().min(0),
  })).min(1).max(30).refine(
    (answers) => new Set(answers.map((answer) => answer.questionId)).size === answers.length,
    "Each question can only be submitted once",
  ),
});

const studentCanAccessSession = async (student: any, studentId: string, session: any) => {
  if (!student || student.role !== "student") return false;
  const contexts = await resolveSchoolContexts({ id: studentId, role: "student", schoolId: student.schoolId || null });
  const hasSchoolContext = contexts.some((context) => context.role === "student" && String(context.schoolId) === String(session.schoolId));
  return hasSchoolContext && (student.groupIds || []).map(String).includes(String(session.classId));
};

const smartClassroomEnabled = async (schoolId: string) =>
  (await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM")).allowed;

const publishedQuestionIds = (session: any) => {
  const ids = Array.isArray(session.publishedQuestionIds) && session.publishedQuestionIds.length > 0
    ? session.publishedQuestionIds.map(String)
    : typeof session.activeQuestionIndex === "number" && session.questionSnapshots?.[session.activeQuestionIndex]
      ? [String(session.questionSnapshots[session.activeQuestionIndex].questionId)]
      : [];
  return Array.from(new Set(ids));
};

const submissionKeyForSession = (session: any) => {
  if (session.publishedMode === "batch" && session.activeBatchId) return `batch:${String(session.activeBatchId)}`;
  return `questions:${publishedQuestionIds(session).slice().sort().join("|")}`;
};

const activeChallengeExpired = (session: any) => {
  if (!session.activeBatchId || !Array.isArray(session.questionBatches)) return false;
  const batch = session.questionBatches.find((entry: any) => String(entry.batchId) === String(session.activeBatchId));
  if (!batch?.competitionEnabled || !batch.timerEndsAt) return false;
  const endsAt = new Date(batch.timerEndsAt).getTime();
  return Number.isFinite(endsAt) && endsAt <= Date.now();
};

export function registerClassroomStudentRoutes(classroomRouter: Router) {
  classroomRouter.get("/student/active-session", requireAuth, asyncHandler(async (req, res) => {
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role name").lean() as any;
    if (!student || student.role !== "student") return res.json({ hasActiveSession: false });
    const contexts = await resolveSchoolContexts({ id: req.authUser!.id, role: "student", schoolId: student.schoolId || null });
    const studentSchoolIds = Array.from(new Set(contexts.filter((context) => context.role === "student").map((context) => String(context.schoolId)).filter(Boolean)));
    if (studentSchoolIds.length === 0) return res.json({ hasActiveSession: false });
    const entitlementChecks = await Promise.all(studentSchoolIds.map(async (schoolId) => ({ schoolId, allowed: await smartClassroomEnabled(schoolId) })));
    const entitledSchoolIds = entitlementChecks.filter((entry) => entry.allowed).map((entry) => entry.schoolId);
    if (entitledSchoolIds.length === 0) return res.json({ hasActiveSession: false });
    const studentClassIds = (student.groupIds || []).map(String).filter((id: string) => Types.ObjectId.isValid(id));
    if (studentClassIds.length === 0) return res.json({ hasActiveSession: false });
    const session = await ClassroomSessionModel.findOne({
      schoolId: { $in: entitledSchoolIds }, classId: { $in: studentClassIds }, status: "live",
    }).sort({ startedAt: -1, createdAt: -1 }).lean() as any;
    if (!session) return res.json({ hasActiveSession: false });
    const [teacher, classroomGroup] = await Promise.all([
      UserModel.findById(session.teacherId).select("name displayName email").lean() as any,
      GroupModel.findById(session.classId).select("name").lean() as any,
    ]);
    res.json({ hasActiveSession: true, session: {
      sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId,
      className: classroomGroup?.name || "فصلك الدراسي", teacherName: teacher?.displayName || teacher?.name || "معلم المادة",
      status: session.status, activeQuestionIndex: session.activeQuestionIndex,
      totalQuestions: session.questionSnapshots?.length || 0, startedAt: session.startedAt || session.createdAt, createdAt: session.createdAt,
    } });
  }));

  classroomRouter.post("/sessions/join-by-pin", requireAuth, sensitiveActionRateLimiter, asyncHandler(async (req, res) => {
    const payload = joinSchema.parse(req.body);
    const session = await ClassroomSessionModel.findOne({ pinHash: hashClassroomPin(payload.pin), status: "live", pinExpiresAt: { $gt: new Date() } })
      .sort({ startedAt: -1, createdAt: -1 }).lean() as any;
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ message: "لم يتم العثور على حصة مباشرة بهذا الرمز أو قد انتهت صلاحيته." });
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الرمز مخصص لحصة فصل دراسي آخر أو مدرسة أخرى." });
    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } }, { upsert: true },
    );
    res.json({ joined: true, sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId });
  }));

  classroomRouter.post("/sessions/:id/instant-join", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || !canStudentJoinClassroom(session.status as ClassroomSessionStatus)) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "الحصة غير مباشرة أو انتهت" });
    }
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "غير مصرح لك بالانضمام لهذه الحصة المخصصة لفصل آخر" });
    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } }, { upsert: true },
    );
    res.json({ joined: true, sessionId: classroomSessionId(session), schoolId: session.schoolId, classId: session.classId });
  }));

  classroomRouter.post("/sessions/:id/join", requireAuth, sensitiveActionRateLimiter, asyncHandler(async (req, res) => {
    const payload = joinSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || !canStudentJoinClassroom(session.status as ClassroomSessionStatus) || session.pinExpiresAt < new Date() || hashClassroomPin(payload.pin) !== session.pinHash) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Session not found" });
    }
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    await ClassroomParticipantModel.updateOne(
      { sessionId: classroomSessionId(session), studentId: req.authUser!.id },
      { $setOnInsert: { joinedAt: new Date() } }, { upsert: true },
    );
    res.json({ joined: true, sessionId: classroomSessionId(session) });
  }));

  classroomRouter.get("/sessions/:id/current", requireAuth, asyncHandler(async (req, res) => {
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active question" });
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    const participant = await ClassroomParticipantModel.findOne({ sessionId: classroomSessionId(session), studentId: req.authUser!.id })
      .select("finalizedSubmissionKeys").lean() as any;
    if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before viewing questions" });
    const publishedSet = new Set(publishedQuestionIds(session));
    const safeQuestions = session.questionSnapshots
      .map((question: any, index: number) => ({ index, raw: question }))
      .filter((item: any) => publishedSet.has(String(item.raw.questionId)))
      .map((item: any) => ({ index: item.index, ...projectClassroomQuestionForStudent(item.raw, true) }));
    const currentQuestion = safeQuestions.find((question: any) => question.index === session.activeQuestionIndex) || safeQuestions[0] || null;
    const batchPosition = safeQuestions.findIndex((question: any) => question.index === session.activeQuestionIndex);
    const submissionKey = submissionKeyForSession(session);
    const submitted = (participant.finalizedSubmissionKeys || []).map(String).includes(submissionKey);
    res.json({ sessionId: classroomSessionId(session), question: currentQuestion, currentIndex: batchPosition >= 0 ? batchPosition : 0,
      globalIndex: session.activeQuestionIndex, totalQuestions: safeQuestions.length, questions: safeQuestions, submissionKey, submitted });
  }));

  classroomRouter.put("/sessions/:id/answers/:questionId", requireAuth, asyncHandler(async (req, res) => {
    const payload = answerSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    if (activeChallengeExpired(session)) return res.status(StatusCodes.CONFLICT).json({ message: "انتهى وقت التحدي ولا يمكن تعديل الإجابات" });
    const publishedSet = new Set(publishedQuestionIds(session));
    if (!publishedSet.has(req.params.questionId)) return res.status(StatusCodes.FORBIDDEN).json({ message: "السؤال غير متاح للإجابة حالياً" });
    const question = session.questionSnapshots.find((candidate: any) => String(candidate.questionId) === req.params.questionId);
    if (!question) return res.status(StatusCodes.CONFLICT).json({ message: "Question is not active" });
    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    const participant = await ClassroomParticipantModel.findOne({ sessionId: classroomSessionId(session), studentId: req.authUser!.id })
      .select("pendingSubmissionKeys finalizedSubmissionKeys").lean() as any;
    if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before answering" });
    const submissionKey = submissionKeyForSession(session);
    if ((participant.finalizedSubmissionKeys || []).map(String).includes(submissionKey)) {
      return res.status(StatusCodes.CONFLICT).json({ message: "تم التسليم النهائي لهذه الدفعة ولا يمكن تعديل الإجابات" });
    }
    if ((participant.pendingSubmissionKeys || []).map(String).includes(submissionKey)) {
      return res.status(StatusCodes.CONFLICT).json({ message: "التسليم النهائي لهذه الدفعة قيد التثبيت الآن" });
    }
    if (payload.selectedOptionIndex >= question.options.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Selected option is invalid" });
    const response = await ClassroomResponseModel.findOneAndUpdate(
      { sessionId: classroomSessionId(session), questionId: question.questionId, studentId: req.authUser!.id },
      { $set: { selectedOptionIndex: payload.selectedOptionIndex, isCorrect: payload.selectedOptionIndex === question.correctOptionIndex, submittedAt: new Date() } },
      { upsert: true, new: true, runValidators: true },
    );
    // The teacher's live state is coalesced separately. Counting the whole
    // question after every answer turns a 100-student burst into 100 extra
    // database reads and does not improve the student's response.
    emitClassroomEvent(classroomSessionId(session), "response:updated", { questionId: question.questionId });
    res.json({ accepted: true, responseId: String(response._id), finalized: false });
  }));

  classroomRouter.post("/sessions/:id/submit", requireAuth, asyncHandler(async (req, res) => {
    const payload = finalSubmitSchema.parse(req.body);
    const session = await ClassroomSessionModel.findById(req.params.id).lean() as any;
    if (!session || session.status !== "live" || typeof session.activeQuestionIndex !== "number") return res.status(StatusCodes.NOT_FOUND).json({ message: "No active session" });
    if (!(await smartClassroomEnabled(String(session.schoolId)))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Smart Classroom is not enabled for this school" });
    if (activeChallengeExpired(session)) return res.status(StatusCodes.CONFLICT).json({ message: "انتهى وقت التحدي ولا يمكن قبول تسليم جديد" });

    const student = await UserModel.findById(req.authUser!.id).select("schoolId groupIds role").lean() as any;
    if (!(await studentCanAccessSession(student, req.authUser!.id, session))) return res.status(StatusCodes.FORBIDDEN).json({ message: "Session access denied" });
    const participant = await ClassroomParticipantModel.findOne({ sessionId: classroomSessionId(session), studentId: req.authUser!.id });
    if (!participant) return res.status(StatusCodes.FORBIDDEN).json({ message: "Join the session before submitting" });

    const submissionKey = submissionKeyForSession(session);
    if ((participant.finalizedSubmissionKeys || []).map(String).includes(submissionKey)) {
      return res.json({ submitted: true, alreadySubmitted: true, submissionKey, acceptedCount: 0 });
    }

    const publishedSet = new Set(publishedQuestionIds(session));
    const questionsById = new Map((session.questionSnapshots || []).map((question: any) => [String(question.questionId), question]));
    for (const answer of payload.answers) {
      if (!publishedSet.has(answer.questionId)) return res.status(StatusCodes.FORBIDDEN).json({ message: "يتضمن التسليم سؤالاً غير متاح حالياً" });
      const question: any = questionsById.get(answer.questionId);
      if (!question) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Question not found in session" });
      if (answer.selectedOptionIndex >= question.options.length) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Selected option is invalid" });
    }

    const lockedParticipant = await ClassroomParticipantModel.findOneAndUpdate(
      {
        _id: participant._id,
        finalizedSubmissionKeys: { $ne: submissionKey },
        pendingSubmissionKeys: { $ne: submissionKey },
      },
      { $addToSet: { pendingSubmissionKeys: submissionKey } },
      { new: true },
    );
    if (!lockedParticipant) {
      const latestParticipant = await ClassroomParticipantModel.findById(participant._id)
        .select("pendingSubmissionKeys finalizedSubmissionKeys").lean() as any;
      if ((latestParticipant?.finalizedSubmissionKeys || []).map(String).includes(submissionKey)) {
        return res.json({ submitted: true, alreadySubmitted: true, submissionKey, acceptedCount: 0 });
      }
      return res.status(StatusCodes.CONFLICT).json({ message: "التسليم النهائي قيد التثبيت. انتظر لحظة ثم حدّث حالة الحصة." });
    }

    const submittedAt = new Date();
    try {
      await ClassroomResponseModel.bulkWrite(payload.answers.map((answer) => {
        const question: any = questionsById.get(answer.questionId);
        return {
          updateOne: {
            filter: { sessionId: classroomSessionId(session), questionId: answer.questionId, studentId: req.authUser!.id },
            update: { $set: { selectedOptionIndex: answer.selectedOptionIndex, isCorrect: answer.selectedOptionIndex === question.correctOptionIndex, submittedAt } },
            upsert: true,
          },
        };
      }));
      await ClassroomParticipantModel.updateOne(
        { _id: participant._id, pendingSubmissionKeys: submissionKey },
        {
          $pull: { pendingSubmissionKeys: submissionKey },
          $addToSet: { finalizedSubmissionKeys: submissionKey },
        },
      );
    } catch (error) {
      await ClassroomParticipantModel.updateOne(
        { _id: participant._id },
        { $pull: { pendingSubmissionKeys: submissionKey } },
      ).catch(() => undefined);
      throw error;
    }

    emitClassroomEvent(classroomSessionId(session), "response:updated", {
      questionIds: payload.answers.map((answer) => answer.questionId),
      finalized: true,
      studentId: req.authUser!.id,
    });
    res.json({ submitted: true, alreadySubmitted: false, submissionKey, acceptedCount: payload.answers.length });
  }));
}
