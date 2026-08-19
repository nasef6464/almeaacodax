import { z } from "zod";

export const questionAttemptSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIndex: z.number().default(-1),
  timeSpentSeconds: z.number().default(0),
  date: z.string().optional(),
});

export const quizSubmitSchema = z.object({
  answers: z.record(z.coerce.number()).default({}),
  timeSpentSeconds: z.number().min(0).default(0),
  source: z.string().optional(),
  sectionResults: z
    .array(
      z.object({
        sectionId: z.string(),
        sectionName: z.string().default(""),
        total: z.number().int().min(0).default(0),
        correct: z.number().int().min(0).default(0),
        wrong: z.number().int().min(0).default(0),
        unanswered: z.number().int().min(0).default(0),
        score: z.number().min(0).max(100).default(0),
      }),
    )
    .optional(),
});
