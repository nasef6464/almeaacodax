import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/questionQuerySchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { dashboardAnalyticsQuerySchema, questionBaseSchema, questionListQuerySchema, questionSchema, quizResultsListQuerySchema } from "../modules/quizzes/http/questionQuerySchemas.js";';
const delegated = routeSource.includes(schemaImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('question transport semantics are preserved', () => {
  for (const fragment of [
    'text: z.string().default("")',
    'options: z.array(z.string()).default([])',
    'correctOptionIndex: z.number().default(0)',
    'skillIds: z.array(z.string()).min(1)',
    'pathId: z.string().min(1)',
    'subject: z.string().min(1)',
    'examType: z.enum(["qudurat", "tahsili", "general"]).optional().default("general")',
    'source: z.enum(["internal", "official_exam", "mock", "imported"]).optional().default("internal")',
    'difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium")',
    'type: z.enum(["mcq", "true_false", "essay"]).default("mcq")',
    'approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional()',
    '(value) => value.text.trim().length > 0 || String(value.imageUrl || "").trim().length > 0',
    'message: "Question must include text or an image URL"',
  ]) assert.ok(schemaSource.includes(fragment), `question schema missing ${fragment}`);
});

check('question list query semantics are preserved', () => {
  for (const fragment of [
    'limit: z.coerce.number().int().min(1).max(100).default(80)',
    'ids: z.string().trim().optional()',
    'skillId: z.string().trim().optional()',
    'year: z.coerce.number().int().min(1990).max(2100).optional()',
    'search: z.string().trim().max(120).optional()',
    'summary: z.coerce.boolean().default(false)',
    'noTotal: z.coerce.boolean().default(false)',
    'paginate: z.coerce.boolean().default(false)',
  ]) assert.ok(schemaSource.includes(fragment), `question list query schema missing ${fragment}`);
});

check('analytics and result query semantics are preserved', () => {
  for (const fragment of [
    'studentLimit: z.coerce.number().int().min(1).max(1000).default(500)',
    'resultLimit: z.coerce.number().int().min(100).max(5000).default(2000)',
    'attemptLimit: z.coerce.number().int().min(100).max(5000).default(3000)',
    'limit: z.coerce.number().int().min(1).max(100).default(50)',
    'studentId: z.string().trim().max(120).optional()',
    'status: z.enum(["passed", "failed"]).optional()',
    'sortBy: z.enum(["createdAt", "score", "quizTitle", "date"]).default("createdAt")',
    'sortOrder: z.enum(["asc", "desc"]).default("desc")',
  ]) assert.ok(schemaSource.includes(fragment), `quiz query schema missing ${fragment}`);
});

check('schema parser call sites remain route-owned', () => {
  for (const fragment of [
    'questionListQuerySchema.parse(req.query)',
    'questionSchema.parse(req.body)',
    'questionBaseSchema.partial().parse(req.body)',
    'dashboardAnalyticsQuerySchema.parse(req.query)',
    'quizResultsListQuerySchema.parse(req.query)',
  ]) assert.ok(routeSource.includes(fragment), `quiz route parser call missing ${fragment}`);
});

check('question and analytics HTTP route surface remains stable', () => {
  for (const fragment of ['"/questions"', '"/analytics/overview"', '"/results"', '"/results/scoped"']) {
    assert.ok(routeSource.includes(fragment), `quiz route missing ${fragment}`);
  }
});

check('question/query schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const questionBaseSchema = z.object({',
    'const questionSchema = questionBaseSchema.refine(',
    'const questionListQuerySchema = z.object({',
    'const dashboardAnalyticsQuerySchema = z.object({',
    'const quizResultsListQuerySchema = z.object({',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'pre-apply'} ownership mismatch for ${declaration}`);
  }
});

check('quiz business rules and submission schemas remain route-owned', () => {
  for (const fragment of [
    'const validateQuizQuestionIntegrity = async',
    'const quizSchema = z.object({',
    'const normalizeQuizPlacementPayload =',
    'const questionAttemptSchema = z.object({',
    'const quizSubmitSchema = z.object({',
    'const canSubmitQuiz = async',
    'QuizResultModel.create({',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost business ownership: ${fragment}`);
});

check('question/query schema module stays transport-only and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'findOne', 'findById', 'QuizModel', 'QuestionModel', 'QuizResultModel',
    'validateQuizQuestionIntegrity', 'normalizeQuizPlacementPayload', 'canSubmitQuiz',
  ]) assert.ok(!schemaSource.includes(forbidden), `quiz schema module must not include ${forbidden}`);
  assert.ok(lineCount(schemaSource) <= 110, `questionQuerySchemas.ts exceeded 110 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-question-query-schema-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
