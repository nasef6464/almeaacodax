import { z } from "zod";

export const questionAttemptSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIndex: z.number().default(-1),
  timeSpentSeconds: z.number().default(0),
  date: z.string().optional(),
  evidenceType: z.enum(["assessment", "remediation", "recheck", "mastery_review"]).default("assessment"),
  activityType: z.enum(['practice', 'review', 'quiz']).optional(),
  quizId: z.string().min(1).max(200).optional(),
  source: z.string().max(100).optional(),
}).refine(payload => payload.activityType === 'quiz' ? Boolean(payload.quizId) : !payload.quizId,
  { message: 'Quiz activity requires a quizId; standalone activity must not carry one' });

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
