import { z } from "zod";

const questionMathExpressionSchema = z.object({
  latex: z.string().max(1000).default(""),
  spokenArabic: z.string().max(2000).default(""),
});

const questionAiContextSchema = z.object({
  readableText: z.string().max(12000).default(""),
  speechText: z.string().max(12000).default(""),
  visualDescription: z.string().max(12000).default(""),
  optionTexts: z.array(z.string().max(4000)).max(12).default([]),
  mathExpressions: z.array(questionMathExpressionSchema).max(32).default([]),
  concepts: z.array(z.string().max(240)).max(32).default([]),
  requiredData: z.array(z.string().max(500)).max(64).default([]),
  version: z.number().int().min(1).max(100).default(1),
});

const questionSourceMetaSchema = z.object({
  documentCode: z.string().max(120).default(""),
  documentTitle: z.string().max(500).default(""),
  sourceItemId: z.string().max(200).default(""),
  pdfPageIndex: z.number().int().min(1).nullable().optional(),
  printedPageNumber: z.number().int().min(1).nullable().optional(),
  printedQuestionNumber: z.number().int().min(0).nullable().optional(),
  page: z.number().int().min(1).nullable().optional(),
  questionNumber: z.string().max(80).default(""),
  cropIndex: z.number().int().min(0).nullable().optional(),
  importBatchId: z.string().max(160).default(""),
  imageVersion: z.number().int().min(1).max(100000).default(1),
  imageHash: z.string().max(256).default(""),
});

export const questionBaseSchema = z.object({
  id: z.string().optional(),
  questionCode: z.string().trim().min(3).max(120).optional(),
  text: z.string().default(""),
  options: z.array(z.string()).default([]),
  correctOptionIndex: z.number().default(0),
  explanation: z.string().optional(),
  hint: z.string().optional(),
  solvingStrategy: z.string().optional(),
  videoUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  optionsEmbeddedInImage: z.boolean().optional().default(false),
  aiContext: questionAiContextSchema.optional(),
  sourceMeta: questionSourceMetaSchema.optional(),
  skillIds: z.array(z.string()).min(1),
  skillId: z.string().min(1).nullable().optional(),
  subSkillId: z.string().min(1).nullable().optional(),
  pathId: z.string().min(1),
  subject: z.string().min(1),
  subjectId: z.string().min(1).nullable().optional(),
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

export const questionSchema = questionBaseSchema
  .refine(
    (value) => value.text.trim().length > 0 || String(value.imageUrl || "").trim().length > 0,
    {
      message: "Question must include text or an image URL",
      path: ["text"],
    },
  )
  .refine(
    (value) => {
      const hasImage = String(value.imageUrl || "").trim().length > 0;
      const publishable = value.approvalStatus === "approved" || value.approvalStatus === "pending_review";
      if (!hasImage || !publishable) return true;
      return String(value.explanation || "").trim().length > 0;
    },
    {
      message: "Published or review-ready image questions require a written explanation",
      path: ["explanation"],
    },
  )
  .refine(
    (value) => {
      if (!value.optionsEmbeddedInImage || value.type !== "mcq") return true;
      const optionTexts = value.aiContext?.optionTexts || [];
      return optionTexts.length === value.options.length && optionTexts.every((option) => option.trim().length > 0);
    },
    {
      message: "Image-embedded options require complete AI option text for every visible option",
      path: ["aiContext", "optionTexts"],
    },
  );



const httpUrlOrBlankSchema = z.string().trim().max(2000).refine(
  (value) => !value || /^https?:\/\//i.test(value),
  "Video URL must be blank or use HTTP(S)",
);

export const questionVideoLinksSchema = z.object({
  items: z.array(
    z.object({
      questionCode: z.string().trim().min(3).max(120),
      videoUrl: httpUrlOrBlankSchema,
    }),
  ).min(1).max(500),
});

export const questionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(80),
  ids: z.string().trim().optional(),
  pathId: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  sectionId: z.string().trim().optional(),
  skillId: z.string().trim().optional(),
  skillIds: z.string().trim().optional(),
  skillLinkStatus: z.enum(["linked", "unlinked"]).optional(),
  difficulty: z.string().trim().optional(),
  type: z.enum(["mcq", "true_false", "essay"]).optional(),
  examType: z.enum(["qudurat", "tahsili", "general"]).optional(),
  source: z.enum(["internal", "official_exam", "mock", "imported"]).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  hasExplanationVideo: z.coerce.boolean().optional(),
  videoStatus: z.enum(["with", "without"]).optional(),
  explanationStatus: z.enum(["with", "without"]).optional(),
  includeCoverage: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  search: z.string().trim().max(120).optional(),
  summary: z.coerce.boolean().default(false),
  noTotal: z.coerce.boolean().default(false),
  paginate: z.coerce.boolean().default(false),
});

export const dashboardAnalyticsQuerySchema = z.object({
  pathId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
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
  pathId: z.string().trim().max(120).optional(),
  subjectId: z.string().trim().max(120).optional(),
  status: z.enum(["passed", "failed"]).optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  sortBy: z.enum(["createdAt", "score", "quizTitle", "date"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
