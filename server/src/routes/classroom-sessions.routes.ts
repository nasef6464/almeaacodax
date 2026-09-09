import crypto from "node:crypto";
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isStaffRole } from "../services/visibility.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { ClassroomAnswerModel } from "../models/ClassroomAnswer.js";
import { ClassroomReportModel } from "../models/ClassroomReport.js";
import { GroupModel } from "../models/Group.js";
import { QuestionModel } from "../models/Question.js";
import { UserModel } from "../models/User.js";
import { generateClassroomReport } from "../services/classroomSessionAnalytics.js";
import { getIo, classroomRoom } from "../sockets/index.js";

const router = express.Router();

// ---------- helpers ----------

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Array.from({ length: 6 }, () => JOIN_CODE_CHARS[crypto.randomInt(JOIN_CODE_CHARS.length)]).join("");
    const exists = await ClassroomSessionModel.findOne({ joinCode: code }).select("_id").lean();
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique join code");
}

/** Teacher must own/supervise the class, or be admin. Reloaded from Mongo,
 *  never trusted from the client — same rule the live-exams route uses. */
async function canManageGroup(groupId: string, authUser: { id: string; role: string }) {
  if (authUser.role === "admin") return true;
  const group = await GroupModel.findOne({
    _id: groupId,
    $or: [{ ownerId: authUser.id }, { supervisorIds: authUser.id }],
  })
    .select("_id")
    .lean();
  return Boolean(group);
}

async function loadOwnedSession(sessionId: string, authUser: { id: string; role: string }) {
  const session = await ClassroomSessionModel.findById(sessionId);
  if (!session) return { session: null, allowed: false } as const;
  const allowed = await canManageGroup(session.groupId, authUser);
  return { session, allowed } as const;
}

function requireStaff(req: express.Request, res: express.Response) {
  if (!isStaffRole(req.authUser?.role)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

// ---------- TEACHER: create / manage ----------

// Create a draft session by pulling a set of question ids from the bank.
// Nothing is copied into the exam system; questionIds are just a snapshot.
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!requireStaff(req, res)) return;
    const authUser = req.authUser!;
    const { groupId, subjectId, title, questionIds } = req.body as {
      groupId?: string;
      subjectId?: string;
      title?: string;
      questionIds?: string[];
    };

    if (!groupId || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "groupId and at least one questionId are required" });
    }
    if (!(await canManageGroup(groupId, authUser))) {
      return res.status(403).json({ error: "You do not manage this class" });
    }

    const validQuestions = await QuestionModel.find({ id: { $in: questionIds } }).select("id").lean();
    const validIds = new Set(validQuestions.map((q: any) => String(q.id)));
    const orderedIds = questionIds.map(String).filter((id) => validIds.has(id));
    if (orderedIds.length === 0) {
      return res.status(400).json({ error: "None of the provided questionIds were found in the bank" });
    }

    const joinCode = await generateUniqueJoinCode();
    const session = await ClassroomSessionModel.create({
      teacherId: authUser.id,
      groupId,
      subjectId: subjectId || "",
      title: title || "",
      joinCode,
      questionIds: orderedIds,
      status: "draft",
    });

    res.status(201).json(session);
  }),
);

// List sessions for the current teacher (or all, for admin).
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!requireStaff(req, res)) return;
    const authUser = req.authUser!;
    const filter: Record<string, unknown> = {};
    if (authUser.role !== "admin") filter.teacherId = authUser.id;
    if (req.query.groupId) filter.groupId = String(req.query.groupId);
    if (req.query.status) filter.status = String(req.query.status);

    const sessions = await ClassroomSessionModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json(sessions);
  }),
);

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const session = await ClassroomSessionModel.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: "Not found" });

    if (isStaffRole(authUser.role)) {
      if (!(await canManageGroup(session.groupId, authUser))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      const isMember = await GroupModel.findOne({ _id: session.groupId, studentIds: authUser.id }).select("_id").lean();
      if (!isMember) return res.status(403).json({ error: "Forbidden" });
    }

    res.json(session);
  }),
);

router.post(
  "/:id/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session, allowed } = await loadOwnedSession(req.params.id, req.authUser!);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (session.status === "ended") return res.status(409).json({ error: "Session already ended" });

    session.status = "live";
    session.startedAt = session.startedAt || new Date();
    session.currentQuestionIndex = 0;
    await session.save();

    getIo()?.to(classroomRoom(String(session._id))).emit("session_started", {
      sessionId: String(session._id),
      currentQuestionIndex: 0,
      questionId: session.questionIds[0],
      totalQuestions: session.questionIds.length,
    });

    res.json(session);
  }),
);

router.post(
  "/:id/next-question",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session, allowed } = await loadOwnedSession(req.params.id, req.authUser!);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });
    if (session.status !== "live") return res.status(409).json({ error: "Session is not live" });

    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex >= session.questionIds.length) {
      return res.status(409).json({ error: "No more questions", done: true });
    }

    session.currentQuestionIndex = nextIndex;
    await session.save();

    getIo()?.to(classroomRoom(String(session._id))).emit("question_opened", {
      sessionId: String(session._id),
      currentQuestionIndex: nextIndex,
      questionId: session.questionIds[nextIndex],
      totalQuestions: session.questionIds.length,
    });

    res.json({ currentQuestionIndex: nextIndex, questionId: session.questionIds[nextIndex] });
  }),
);

router.post(
  "/:id/end",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session, allowed } = await loadOwnedSession(req.params.id, req.authUser!);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    session.status = "ended";
    session.endedAt = new Date();
    await session.save();

    const report = await generateClassroomReport(String(session._id));

    getIo()?.to(classroomRoom(String(session._id))).emit("session_ended", { sessionId: String(session._id) });

    res.json({ session, report });
  }),
);

// Fallback for teachers whose socket connection dropped — polls the same
// numbers the socket events push, scoped to the currently open question.
router.get(
  "/:id/live-stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session, allowed } = await loadOwnedSession(req.params.id, req.authUser!);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const [group, currentQuestionAnswers, allAnswers] = await Promise.all([
      GroupModel.findOne({ _id: session.groupId }).select("studentIds").lean(),
      session.currentQuestionIndex >= 0
        ? ClassroomAnswerModel.find({
            sessionId: String(session._id),
            questionId: session.questionIds[session.currentQuestionIndex],
          }).lean()
        : Promise.resolve([]),
      ClassroomAnswerModel.find({ sessionId: String(session._id) }).select("studentId").lean(),
    ]);

    const studentIds: string[] = Array.isArray(group?.studentIds) ? group.studentIds.map(String) : [];
    const students = studentIds.length
      ? await UserModel.find({ _id: { $in: studentIds } }).select("_id name").lean()
      : [];

    const answeredCurrentBy = new Set(currentQuestionAnswers.map((a: any) => String(a.studentId)));
    const answeredCurrentCorrectBy = new Set(
      currentQuestionAnswers.filter((a: any) => a.isCorrect).map((a: any) => String(a.studentId)),
    );
    const everAnsweredBy = new Set(allAnswers.map((a: any) => String(a.studentId)));

    const roster = students.map((s: any) => ({
      studentId: String(s._id),
      name: s.name,
      joined: everAnsweredBy.has(String(s._id)), // best-effort until join tracking is added
      answeredCurrent: answeredCurrentBy.has(String(s._id)),
      correctCurrent: answeredCurrentCorrectBy.has(String(s._id)),
    }));

    res.json({
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questionIds.length,
      totalAnswered: currentQuestionAnswers.length,
      correctCount: currentQuestionAnswers.filter((a: any) => a.isCorrect).length,
      roster,
    });
  }),
);

router.get(
  "/:id/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { session, allowed } = await loadOwnedSession(req.params.id, req.authUser!);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const report = await ClassroomReportModel.findOne({ sessionId: String(session._id) }).lean();
    if (!report) return res.status(404).json({ error: "Report not generated yet" });
    res.json(report);
  }),
);

// ---------- STUDENT ----------

router.post(
  "/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const joinCode = String(req.body?.joinCode || "").toUpperCase().trim();
    if (!joinCode) return res.status(400).json({ error: "joinCode is required" });

    const session = await ClassroomSessionModel.findOne({ joinCode, status: { $in: ["draft", "live"] } });
    if (!session) return res.status(404).json({ error: "Invalid or expired code" });

    if (!isStaffRole(authUser.role)) {
      const isMember = await GroupModel.findOne({ _id: session.groupId, studentIds: authUser.id }).select("_id").lean();
      if (!isMember) return res.status(403).json({ error: "You are not in this class" });
    }

    res.json({
      sessionId: String(session._id),
      title: session.title,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questionIds.length,
      currentQuestionId: session.currentQuestionIndex >= 0 ? session.questionIds[session.currentQuestionIndex] : null,
    });
  }),
);

router.post(
  "/:id/answer",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUser = req.authUser!;
    const { questionId, selectedOptionIndex, timeTakenMs } = req.body as {
      questionId?: string;
      selectedOptionIndex?: number;
      timeTakenMs?: number;
    };

    const session = await ClassroomSessionModel.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: "Not found" });
    if (session.status !== "live") return res.status(409).json({ error: "Session is not live" });
    if (!questionId || !session.questionIds.includes(String(questionId))) {
      return res.status(400).json({ error: "This question is not part of the session" });
    }

    const isMember = await GroupModel.findOne({ _id: session.groupId, studentIds: authUser.id }).select("_id").lean();
    if (!isMember) return res.status(403).json({ error: "You are not in this class" });

    const question = await QuestionModel.findOne({ id: String(questionId) }).select("correctOptionIndex").lean();
    if (!question) return res.status(404).json({ error: "Question not found" });

    const isCorrect = Number(selectedOptionIndex) === Number(question.correctOptionIndex);
    const filter = { sessionId: String(session._id), studentId: authUser.id, questionId: String(questionId) };
    const update = {
      $set: {
        selectedOptionIndex: Number(selectedOptionIndex ?? -1),
        isCorrect,
        timeTakenMs: Number(timeTakenMs || 0),
        answeredAt: new Date(),
      },
    };

    try {
      await ClassroomAnswerModel.findOneAndUpdate(filter, update, { upsert: true });
    } catch (error: any) {
      // Two rapid submits can race past the findOneAndUpdate upsert before
      // the unique index observes the first insert — same pattern used by
      // saveAssessmentResponse in live-exams.routes.ts.
      if (error?.code !== 11000) throw error;
      await ClassroomAnswerModel.updateOne(filter, update);
    }

    getIo()?.to(classroomRoom(String(session._id))).emit("student_answered", {
      sessionId: String(session._id),
      studentId: authUser.id,
      questionId,
      isCorrect,
    });

    res.json({ isCorrect });
  }),
);

export const classroomSessionsRouter = router;
