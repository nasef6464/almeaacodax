import type { Request, Response } from "express";
import mongoose from "mongoose";
import { GroupModel } from "../../../models/Group.js";
import { LiveExamSessionModel } from "../../../models/LiveExamSession.js";
import { QuizModel } from "../../../models/Quiz.js";
import { UserModel } from "../../../models/User.js";
import { isStaffRole } from "../../../services/visibility.js";
import {
  AssessmentAttemptLimitError,
  getOrCreateAssessmentAttempt,
} from "../application/getOrCreateAssessmentAttempt.js";
import { AssessmentAssignmentModel } from "../infrastructure/assessmentAssignmentModel.js";
import { AssessmentVersionModel } from "../infrastructure/assessmentVersionModel.js";

const isDuplicateKeyError = (error: unknown) => Number((error as any)?.code) === 11000;

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = [...new Set(values.map(String).filter(Boolean))];
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  return objectIds.length
    ? { $or: [{ _id: { $in: objectIds } }, { id: { $in: ids } }] }
    : { id: { $in: ids } };
};

/** Preserve the existing directed-assessment access boundary while moving only
 * start/idempotency ownership behind the canonical adapter. */
async function canStartDirectedQuiz(quiz: any, authUser: { id: string; role: string }) {
  if (isStaffRole(authUser.role)) return true;

  const targetUserIds = new Set((quiz.targetUserIds || []).map(String));
  const targetGroupIds = Array.from(new Set<string>((quiz.targetGroupIds || []).map(String)));
  if (targetUserIds.size === 0 && targetGroupIds.length === 0) return true;

  const learner = await (mongoose.Types.ObjectId.isValid(authUser.id)
    ? UserModel.findById(authUser.id)
    : UserModel.findOne({ id: authUser.id }))
    .select("_id id")
    .lean();
  if (!learner) return false;

  const learnerId = String((learner as any).id || learner._id);
  if (targetUserIds.has(learnerId)) return true;
  if (targetGroupIds.length === 0) return false;

  return Boolean(
    await GroupModel.findOne({
      $and: [buildDocumentsByIdsQuery(targetGroupIds), { studentIds: learnerId }],
    })
      .select("_id")
      .lean(),
  );
}

async function getOrCreateVersion(quiz: any) {
  const assessmentId = String(quiz.id || quiz._id);
  const filter = { assessmentId, version: 1 };
  try {
    return await AssessmentVersionModel.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          definition: quiz,
          publishedBy: String(quiz.createdBy || "system"),
          status: "published",
        },
      },
      { new: true, upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const winner = await AssessmentVersionModel.findOne(filter);
    if (!winner) throw error;
    return winner;
  }
}

async function getOrCreateAssignment(quiz: any, versionId: string) {
  const assessmentId = String(quiz.id || quiz._id);
  const filter = { assessmentId, assessmentVersionId: versionId };
  try {
    return await AssessmentAssignmentModel.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          audience: {
            groupIds: quiz.targetGroupIds || [],
            userIds: quiz.targetUserIds || [],
          },
          maxAttempts: Number(quiz.settings?.maxAttempts || 1),
          createdBy: String(quiz.createdBy || "system"),
        },
      },
      { new: true, upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const winner = await AssessmentAssignmentModel.findOne(filter);
    if (!winner) throw error;
    return winner;
  }
}

async function getOrCreateLiveSession(input: {
  studentId: string;
  studentName: string;
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  assessmentAttemptId?: string;
}) {
  const filter = {
    studentId: input.studentId,
    quizId: input.quizId,
    status: "active",
  };
  const update = {
    $set: {
      studentName: input.studentName,
      quizTitle: input.quizTitle,
      totalQuestions: input.totalQuestions,
      ...(input.assessmentAttemptId ? { assessmentAttemptId: input.assessmentAttemptId } : {}),
    },
    $setOnInsert: {
      answeredQuestions: 0,
      progress: 0,
      startTime: new Date(),
      status: "active",
    },
  };

  try {
    return await LiveExamSessionModel.findOneAndUpdate(filter, update, { new: true, upsert: true });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // The partial unique active-session index selected the concurrent winner.
    // Update non-progress metadata on that row but preserve its start/progress.
    const winner = await LiveExamSessionModel.findOneAndUpdate(
      filter,
      { $set: update.$set },
      { new: true },
    );
    if (!winner) throw error;
    return winner;
  }
}

export async function liveExamStartHandler(req: Request, res: Response) {
  try {
    const { quizId, quizTitle, totalQuestions } = req.body || {};
    const userId = String(req.authUser!.id);
    const userName = String((req.authUser as any).name || "طالب");
    const normalizedQuizId = String(quizId);

    const quiz = await QuizModel.findOne({
      $or: [
        { id: normalizedQuizId },
        ...(normalizedQuizId.match(/^[a-f\d]{24}$/i) ? [{ _id: normalizedQuizId }] : []),
      ],
    }).lean();

    let assessmentAttemptId: string | undefined;
    if (quiz) {
      if (!(await canStartDirectedQuiz(quiz, { id: userId, role: String(req.authUser!.role || "") }))) {
        return res.status(403).json({ error: "Not authorized to start this assessment" });
      }

      const version = await getOrCreateVersion(quiz);
      if (!version) throw new Error("Assessment version upsert returned no document");
      const assignment = await getOrCreateAssignment(quiz, String(version._id));
      if (!assignment) throw new Error("Assessment assignment upsert returned no document");

      const timeLimitMinutes = Number(quiz.settings?.timeLimit || 0);
      const attempt = await getOrCreateAssessmentAttempt({
        assignmentId: String(assignment._id),
        assessmentVersionId: String(version._id),
        studentId: userId,
        maxAttempts: Number(assignment.maxAttempts || 1),
        ...(timeLimitMinutes > 0
          ? { expiresAt: new Date(Date.now() + timeLimitMinutes * 60_000) }
          : {}),
      });
      assessmentAttemptId = String(attempt._id);
    }

    const session = await getOrCreateLiveSession({
      studentId: userId,
      studentName: userName,
      quizId: normalizedQuizId,
      quizTitle: String(quizTitle || "اختبار"),
      totalQuestions: Number(totalQuestions || 0),
      assessmentAttemptId,
    });

    return res.json(session);
  } catch (error) {
    if (error instanceof AssessmentAttemptLimitError) {
      return res.status(409).json({
        error: error.message,
        maxAttempts: error.maxAttempts,
        attemptsUsed: error.attemptsUsed,
      });
    }
    console.error("Error starting live exam session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
