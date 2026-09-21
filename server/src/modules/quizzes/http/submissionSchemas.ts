import { z } from "zod";

export const quizEvidenceTypeSchema = z.enum([
  "assessment",
  "remediation",
  "recheck",
  "mastery_review",
]);

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
  evidenceType: quizEvidenceTypeSchema.optional(),
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

export const selfAssessmentSubmitSchema = z.object({
  submissionId: z.string().min(8).max(128),
  questionIds: z.array(z.string().min(1)).min(1).max(20),
  answers: z.record(z.coerce.number()).default({}),
  timeSpentSeconds: z.number().min(0).max(60 * 60 * 3).default(0),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().optional(),
  skillIds: z.array(z.string().min(1)).max(10).default([]),
  evidenceType: quizEvidenceTypeSchema.default("assessment"),
  title: z.string().max(160).optional(),
});
