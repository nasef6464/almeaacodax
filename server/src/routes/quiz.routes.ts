import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { QuizModel } from "../models/Quiz.js";
import { QuestionModel } from "../models/Question.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctOptionIndex: z.number().default(0),
  explanation: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  skillIds: z.array(z.string()).min(1),
  pathId: z.string().min(1),
  subject: z.string().min(1),
  sectionId: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  type: z.enum(["mcq", "true_false", "essay"]).default("mcq"),
});

const quizSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  type: z.enum(["quiz", "bank"]).default("quiz"),
  mode: z.enum(["regular", "saher", "central"]).default("regular"),
  settings: z.record(z.any()),
  access: z.record(z.any()),
  questionIds: z.array(z.string()).default([]),
  skillIds: z.array(z.string()).optional(),
  targetGroupIds: z.array(z.string()).default([]),
  targetUserIds: z.array(z.string()).default([]),
  dueDate: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
});

const buildDocumentQuery = (value: string) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return { $or: [{ id: value }, { _id: value }] };
  }

  return { id: value };
};

const resolveQuizSkillIds = async (questionIds: string[]) => {
  if (questionIds.length === 0) {
    return [];
  }

  const questions = await QuestionModel.find({ id: { $in: questionIds } }).select("skillIds");
  return [...new Set(questions.flatMap((question) => question.skillIds || []).filter(Boolean))];
};

export const quizRouter = Router();

quizRouter.get(
  "/questions",
  asyncHandler(async (_req, res) => {
    const items = await QuestionModel.find().sort({ createdAt: -1 });
    res.json(items);
  }),
);

quizRouter.post(
  "/questions",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = questionSchema.parse(req.body);
    const created = await QuestionModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

quizRouter.patch(
  "/questions/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = questionSchema.partial().parse(req.body);
    const updated = await QuestionModel.findOneAndUpdate(
      buildDocumentQuery(req.params.id),
      payload,
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    return res.json(updated);
  }),
);

quizRouter.delete(
  "/questions/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await QuestionModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Question not found" });
    }

    return res.json({ success: true });
  }),
);

quizRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await QuizModel.find().sort({ createdAt: -1 });
    res.json(items);
  }),
);

quizRouter.get(
  "/results",
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await QuizResultModel.find({ userId: req.authUser!.id }).sort({ createdAt: -1 });
    res.json(items);
  }),
);

quizRouter.get(
  "/results/latest",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await QuizResultModel.findOne({ userId: req.authUser!.id }).sort({ createdAt: -1 });

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No quiz results found" });
    }

    return res.json(item);
  }),
);

quizRouter.post(
  "/",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = quizSchema.parse(req.body);
      const resolvedSkillIds = await resolveQuizSkillIds(payload.questionIds);
      const created = await QuizModel.create({
        ...payload,
        skillIds: resolvedSkillIds,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

quizRouter.patch(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = quizSchema.partial().parse(req.body);
      const resolvedSkillIds = payload.questionIds
        ? await resolveQuizSkillIds(payload.questionIds)
        : undefined;
    const updated = await QuizModel.findOneAndUpdate(
      buildDocumentQuery(req.params.id),
      {
        ...payload,
        ...(resolvedSkillIds ? { skillIds: resolvedSkillIds } : {}),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    return res.json(updated);
  }),
);

quizRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await QuizModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Quiz not found" });
    }

    return res.json({ success: true });
  }),
);

quizRouter.post(
  "/results",
  requireAuth,
  asyncHandler(async (req, res) => {
    const created = await QuizResultModel.create({
      ...req.body,
      userId: req.authUser!.id,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);
