import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { QuizModel } from "../models/Quiz.js";
import { QuestionModel } from "../models/Question.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctOptionIndex: z.number().default(0),
  explanation: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  skillIds: z.array(z.string()).optional(),
  pathId: z.string().optional(),
  subject: z.string().min(1),
  sectionId: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  type: z.enum(["mcq", "true_false", "essay"]).default("mcq"),
});

const quizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  type: z.enum(["quiz", "bank"]).default("quiz"),
  settings: z.record(z.any()),
  access: z.record(z.any()),
  questionIds: z.array(z.string()).default([]),
  skillIds: z.array(z.string()).optional(),
  isPublished: z.boolean().default(false),
});

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
    const created = await QuizModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
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
