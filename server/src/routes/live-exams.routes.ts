import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { LiveExamSessionModel } from "../models/LiveExamSession.js";
import { GroupModel } from "../models/Group.js";
import { QuizModel } from "../models/Quiz.js";
import { AssessmentVersionModel } from "../modules/quizzes/infrastructure/assessmentVersionModel.js";
import { AssessmentAssignmentModel } from "../modules/quizzes/infrastructure/assessmentAssignmentModel.js";
import { AssessmentAttemptModel } from "../modules/quizzes/infrastructure/assessmentAttemptModel.js";
import { AssessmentResponseModel } from "../modules/quizzes/infrastructure/assessmentResponseModel.js";

const router = express.Router();

/**
 * STUDENT ENDPOINTS
 */

// Start an exam session
router.post("/start", requireAuth, async (req, res) => {
  try {
    const { quizId, quizTitle, totalQuestions } = req.body;
    const userId = req.authUser!.id;
    const userName = (req.authUser as any).name || "طالب";

    const quiz = await QuizModel.findOne({ $or: [{ id: String(quizId) }, ...(String(quizId).match(/^[a-f\d]{24}$/i) ? [{ _id: quizId }] : [])] }).lean();
    let assessmentAttemptId: string | undefined;
    if (quiz) {
      const version = await AssessmentVersionModel.findOneAndUpdate(
        { assessmentId: String(quiz.id || quiz._id), version: 1 },
        { $setOnInsert: { definition: quiz, publishedBy: String(quiz.createdBy || "system"), status: "published" } },
        { new: true, upsert: true },
      );
      const assignment = await AssessmentAssignmentModel.findOneAndUpdate(
        { assessmentId: String(quiz.id || quiz._id), assessmentVersionId: String(version._id) },
        { $setOnInsert: { audience: { groupIds: quiz.targetGroupIds || [], userIds: quiz.targetUserIds || [] }, maxAttempts: Number(quiz.settings?.maxAttempts || 1), createdBy: String(quiz.createdBy || "system") } },
        { new: true, upsert: true },
      );
      const existingAttempt = await AssessmentAttemptModel.findOne({ assignmentId: String(assignment._id), studentId: String(userId), status: "in_progress" }).sort({ attemptNumber: -1 });
      if (!existingAttempt) {
        const attemptsUsed = await AssessmentAttemptModel.countDocuments({
          assignmentId: String(assignment._id),
          studentId: String(userId),
          status: { $in: ["submitted", "expired"] },
        });
        if (attemptsUsed >= Number(assignment.maxAttempts || 1)) {
          return res.status(409).json({ error: "Assessment attempt limit reached", maxAttempts: assignment.maxAttempts, attemptsUsed });
        }
      }
      const attempt = existingAttempt || await AssessmentAttemptModel.create({
        assignmentId: String(assignment._id), assessmentVersionId: String(version._id), studentId: String(userId),
        attemptNumber: (await AssessmentAttemptModel.countDocuments({ assignmentId: String(assignment._id), studentId: String(userId) })) + 1,
        status: "in_progress", expiresAt: quiz.settings?.timeLimit ? new Date(Date.now() + Number(quiz.settings.timeLimit) * 60000) : undefined,
      });
      assessmentAttemptId = String(attempt._id);
    }

    // Upsert an active session (in case they refresh), preserving start time
    // and progress so refresh/resume is idempotent.
    const session = await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      {
        $set: { studentName: userName, quizTitle: quizTitle || "اختبار", totalQuestions: totalQuestions || 0, ...(assessmentAttemptId ? { assessmentAttemptId } : {}) },
        $setOnInsert: { answeredQuestions: 0, progress: 0, startTime: new Date(), status: "active" },
      },
      { new: true, upsert: true }
    );

    res.json(session);
  } catch (error) {
    console.error("Error starting live exam session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update progress
router.get("/session/:quizId", requireAuth, async (req, res) => {
  try {
    const userId = String(req.authUser!.id);
    const quizId = String(req.params.quizId);
    const session = await LiveExamSessionModel.findOne({ studentId: userId, quizId, status: "active" }).lean();
    if (!session) return res.json({ session: null, answers: {} });
    const responses = session.assessmentAttemptId
      ? await AssessmentResponseModel.find({ attemptId: session.assessmentAttemptId, studentId: userId }).select("questionId answer").lean()
      : [];
    const answers = Object.fromEntries(responses.map((response: any) => [String(response.questionId), response.answer]));
    return res.json({ session, answers });
  } catch (error) {
    console.error("Error reading live exam session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update progress
router.post("/progress", requireAuth, async (req, res) => {
  try {
    const { quizId, answeredQuestions, totalQuestions, answers } = req.body;
    const userId = req.authUser!.id;

    const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    const activeSession = await LiveExamSessionModel.findOne({ studentId: userId, quizId, status: "active" });
    if (activeSession?.assessmentAttemptId) {
      const attempt = await AssessmentAttemptModel.findById(activeSession.assessmentAttemptId).select("status expiresAt").lean();
      if (attempt && (attempt.status !== "in_progress" || (attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()))) {
        await Promise.all([
          AssessmentAttemptModel.findOneAndUpdate(
            { _id: activeSession.assessmentAttemptId, studentId: String(userId), status: "in_progress" },
            { status: "expired", submittedAt: new Date() },
          ),
          LiveExamSessionModel.updateOne({ _id: activeSession._id, status: "active" }, { status: "completed", progress: 100 }),
        ]);
        return res.status(409).json({ error: "Assessment session expired" });
      }
    }

    const session = await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      { $set: { answeredQuestions, totalQuestions, progress } },
      { new: true },
    );

    if (session?.assessmentAttemptId && answers && typeof answers === "object") {
      await Promise.all(Object.entries(answers).map(([questionId, answer]) =>
        AssessmentResponseModel.findOneAndUpdate(
          { attemptId: session.assessmentAttemptId, questionId },
          { $set: { studentId: String(userId), answer, savedAt: new Date() } },
          { upsert: true },
        ),
      ));
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating live exam progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// End exam session
router.post("/end", requireAuth, async (req, res) => {
  try {
    const { quizId } = req.body;
    const userId = req.authUser!.id;

    const activeSession = await LiveExamSessionModel.findOne({ studentId: userId, quizId, status: "active" });
    if (activeSession?.assessmentAttemptId) {
      const attempt = await AssessmentAttemptModel.findById(activeSession.assessmentAttemptId).select("status expiresAt").lean();
      if (attempt && (attempt.status !== "in_progress" || (attempt.expiresAt && attempt.expiresAt.getTime() <= Date.now()))) {
        await Promise.all([
          AssessmentAttemptModel.findOneAndUpdate(
            { _id: activeSession.assessmentAttemptId, studentId: String(userId), status: "in_progress" },
            { status: "expired", submittedAt: new Date() },
          ),
          LiveExamSessionModel.updateOne({ _id: activeSession._id, status: "active" }, { status: "completed", progress: 100 }),
        ]);
        return res.status(409).json({ error: "Assessment session expired" });
      }
    }

    const session = await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      { status: "completed", progress: 100 }
    );
    if (session?.assessmentAttemptId) {
      await AssessmentAttemptModel.findOneAndUpdate(
        { _id: session.assessmentAttemptId, studentId: String(userId), status: "in_progress" },
        { status: "submitted", submittedAt: new Date() },
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error ending live exam session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * SUPERVISOR ENDPOINTS
 */

// Get active exam sessions for students under this supervisor's purview
router.get("/supervisor", requireAuth, async (req, res) => {
  try {
    const user = req.authUser!;
    if (user.role !== "supervisor" && user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    let targetStudentIds: string[] = [];

    if (user.role === "admin") {
      // Admin sees everyone (or maybe limit it, but for now fetch all active)
      const sessions = await LiveExamSessionModel.find({ status: "active" }).sort({ startTime: -1 }).limit(50);
      return res.json(sessions);
    }

    // Supervisor sees only their group's students
    const groups = await GroupModel.find({ supervisorIds: user.id });
    groups.forEach((g: any) => {
      if (g.studentIds && Array.isArray(g.studentIds)) {
        targetStudentIds.push(...g.studentIds.map(String));
      }
    });

    targetStudentIds = [...new Set(targetStudentIds)]; // Deduplicate

    if (targetStudentIds.length === 0) {
      return res.json([]);
    }

    const sessions = await LiveExamSessionModel.find({
      status: "active",
      studentId: { $in: targetStudentIds },
    }).sort({ startTime: -1 });

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching supervisor live exams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin endpoint to clear test data
router.delete("/clear-test-data", requireAuth, async (req, res) => {
  try {
    const user = req.authUser!;
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    await LiveExamSessionModel.deleteMany({});
    res.json({ success: true, message: "Cleared all live exam sessions" });
  } catch (error) {
    console.error("Error clearing live exams test data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
