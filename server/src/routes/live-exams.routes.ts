import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { LiveExamSessionModel } from "../models/LiveExamSession.js";
import { GroupModel } from "../models/Group.js";

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

    // Upsert an active session (in case they refresh)
    const session = await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      {
        studentName: userName,
        quizTitle: quizTitle || "اختبار",
        totalQuestions: totalQuestions || 0,
        answeredQuestions: 0,
        progress: 0,
        startTime: new Date(),
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
router.post("/progress", requireAuth, async (req, res) => {
  try {
    const { quizId, answeredQuestions, totalQuestions } = req.body;
    const userId = req.authUser!.id;

    const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      { answeredQuestions, totalQuestions, progress }
    );

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

    await LiveExamSessionModel.findOneAndUpdate(
      { studentId: userId, quizId, status: "active" },
      { status: "completed", progress: 100 }
    );

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
