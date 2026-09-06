import { z } from "zod";

export const questionBaseSchema = z.object({
  id: z.string().optional(),
  text: z.string().default(""),
  options: z.array(z.string()).default([]),
  correctOptionIndex: z.number().default(0),
  explanation: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  skillIds: z.array(z.string()).min(1),
  pathId: z.string().min(1),
  subject: z.string().min(1),
  sectionId: z.string().optional(),
  examType: z.enum(["qudurat", "tahsili", "general"]).optional().default("general"),
  source: z.enum(["internal", "official_exam", "mock", "imported"]).optional().default("internal"),
  year: z.number().int().min(1990).max(2100).nullable().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  type: z.enum(["mcq", "true_false", "essay"]).default("mcq"),
  ownerType: z.enum(["platform", "teacher", "school"]).optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  assignedTeacherId: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().nullable().optional(),
  reviewerNotes: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
});

export const questionSchema = questionBaseSchema.refine(
  (value) => value.text.trim().length > 0 || String(value.imageUrl || "").trim().length > 0,
  {
    message: "Question must include text or an image URL",
    path: ["text"],
  },
);

export const questionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(80),
  ids: z.string().trim().optional(),
  pathId: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  skillId: z.string().trim().optional(),
  skillIds: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  type: z.enum(["mcq", "true_false", "essay"]).optional(),
  examType: z.enum(["qudurat", "tahsili", "general"]).optional(),
  source: z.enum(["internal", "official_exam", "mock", "imported"]).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  hasExplanationVideo: z.coerce.boolean().optional(),
  search: z.string().trim().max(120).optional(),
  summary: z.coerce.boolean().default(false),
  noTotal: z.coerce.boolean().default(false),
  paginate: z.coerce.boolean().default(false),
});

export const dashboardAnalyticsQuerySchema = z.object({
  studentLimit: z.coerce.number().int().min(1).max(1000).default(500),
  resultLimit: z.coerce.number().int().min(100).max(5000).default(2000),
  attemptLimit: z.coerce.number().int().min(100).max(5000).default(3000),
});

export const quizResultsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  noTotal: z.coerce.boolean().default(false),
  search: z.string().trim().max(120).optional(),
  quizId: z.string().trim().max(120).optional(),
  studentId: z.string().trim().max(120).optional(),
  status: z.enum(["passed", "failed"]).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "score", "quizTitle", "date"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
