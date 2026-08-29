import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/quizDefinitionSchema.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { quizSchema } from "../modules/quizzes/http/quizDefinitionSchema.js";';
const submissionSchemaImport = 'import { questionAttemptSchema, quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";';
const delegated = routeSource.includes(schemaImport);
const submissionSchemasDelegated = routeSource.includes(submissionSchemaImport);
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
    'qiyasCategory: z.enum(["qudrat", "tahsili", "specialized"]).optional()',
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
  const behaviorIndex = routeSource.indexOf('const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;');
  assert.ok(importIndex >= 0 && behaviorIndex >= 0 && importIndex < behaviorIndex, 'quiz definition import must stay with transport imports');
});

check('submission schema ownership handoff is explicit when delegated by a later phase', () => {
  for (const declaration of ['const questionAttemptSchema = z.object({', 'const quizSubmitSchema = z.object({']) {
    assert.equal(
      routeSource.includes(declaration),
      !submissionSchemasDelegated,
      `${submissionSchemasDelegated ? 'delegated' : 'route-owned'} submission ownership mismatch for ${declaration}`,
    );
  }
  if (submissionSchemasDelegated) {
    assert.equal(routeSource.split(submissionSchemaImport).length - 1, 1, 'submission schema import must be singular');
    assert.ok(routeSource.includes('questionAttemptSchema.parse(req.body)'), 'question-attempt parser call must remain route-owned');
    assert.ok(routeSource.includes('quizSubmitSchema.parse(req.body)'), 'quiz-submit parser call must remain route-owned');
    assert.ok(routeSource.includes('payload: z.infer<typeof quizSubmitSchema>'), 'quiz submit inferred payload type must remain route-owned');
  }
});

check('quiz normalization, integrity, submission behavior and persistence remain route-owned', () => {
  for (const fragment of [
    'const normalizeQuizPlacementPayload = <T extends Record<string, any>>',
    'const assertQuizWindowIsOpen =',
    'const canSubmitQuiz = async',
    'QuestionAttemptModel.create({',
    'QuizResultModel.create({',
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
  submissionSchemasDelegated,
  routeLines: lineCount(routeSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
