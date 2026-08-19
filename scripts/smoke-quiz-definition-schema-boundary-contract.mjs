import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/quizDefinitionSchema.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";';
const delegated = routeSource.includes(schemaImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('quiz definition transport semantics are preserved', () => {
  for (const fragment of [
    'title: z.string().min(1)',
    'pathId: z.string().min(1)',
    'subjectId: z.string().min(1)',
    'type: z.enum(["quiz", "bank"]).default("quiz")',
    'quizKind: z.enum(["drill", "test", "mock"]).default("test")',
    'placement: z.enum(["training", "mock", "both"]).optional()',
    'slot: z.enum(["training", "tests", "foundation", "course"])',
    'accessType: z.enum(["inherit", "free", "paid", "package"]).optional().default("inherit")',
    'mode: z.enum(["regular", "saher", "central"]).default("regular")',
    'questionIds: z.array(z.string()).default([])',
    'qiyasCategory: z.enum(["qudrat", "tahsili"]).optional()',
    'domain: z.enum(["quantitative", "verbal", "math", "physics", "chemistry", "biology", "general"]).optional()',
    'targetGroupIds: z.array(z.string()).default([])',
    'targetUserIds: z.array(z.string()).default([])',
    'isPublished: z.boolean().default(false)',
    'showOnPlatform: z.boolean().default(true)',
    'approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional()',
  ]) assert.ok(schemaSource.includes(fragment), `quiz definition schema missing ${fragment}`);
});

check('quiz definition parser call sites remain route-owned', () => {
  for (const fragment of [
    'normalizeQuizPlacementPayload(quizSchema.parse(req.body))',
    'quizSchema.partial().parse(req.body)',
  ]) assert.ok(routeSource.includes(fragment), `quiz route parser call missing ${fragment}`);
});

check('quiz definition ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  assert.equal(routeSource.includes('const quizSchema = z.object({'), !delegated, 'quiz definition ownership mismatch');
});

check('delegated quiz definition import is singular and before route-local behavior', () => {
  if (!delegated) return;
  assert.equal(routeSource.split(schemaImport).length - 1, 1, 'quiz definition import must be singular');
  const importIndex = routeSource.indexOf(schemaImport);
  const behaviorIndex = routeSource.indexOf('const QUESTION_SUMMARY_TEXT_LIMIT = 280;');
  assert.ok(importIndex >= 0 && behaviorIndex >= 0 && importIndex < behaviorIndex, 'quiz definition import must stay with transport imports');
});

check('quiz normalization, integrity, submission and persistence remain route-owned', () => {
  for (const fragment of [
    'const normalizeQuizPlacementPayload = <T extends Record<string, any>>',
    'const validateQuizQuestionIntegrity = async',
    'const questionAttemptSchema = z.object({',
    'const quizSubmitSchema = z.object({',
    'const canSubmitQuiz = async',
    'QuizModel.create({',
    'QuizModel.findOneAndUpdate(',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost behavior ownership: ${fragment}`);
});

check('quiz definition module stays transport-only and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'QuizModel', 'QuestionModel', 'normalizeQuizPlacementPayload', 'validateQuizQuestionIntegrity',
    'quizSubmitSchema', 'canSubmitQuiz',
  ]) assert.ok(!schemaSource.includes(forbidden), `quiz definition module must not include ${forbidden}`);
  assert.ok(lineCount(schemaSource) <= 90, `quizDefinitionSchema.ts exceeded 90 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-definition-schema-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
