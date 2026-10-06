import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const schemaSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/submissionSchemas.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const schemaImport = 'import { questionAttemptSchema, quizSubmitSchema } from "../modules/quizzes/http/submissionSchemas.js";';
const delegated = routeSource.includes(schemaImport);
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('question attempt transport semantics are preserved', () => {
  for (const fragment of [
    'questionId: z.string().min(1)',
    'selectedOptionIndex: z.number().default(-1)',
    'timeSpentSeconds: z.number().default(0)',
    'date: z.string().optional()',
  ]) assert.ok(schemaSource.includes(fragment), `question attempt schema missing ${fragment}`);
});

check('quiz submit transport semantics are preserved', () => {
  for (const fragment of [
    'answers: z.record(z.coerce.number()).default({})',
    'timeSpentSeconds: z.number().min(0).default(0)',
    'source: z.string().optional()',
    'sectionId: z.string()',
    'sectionName: z.string().default("")',
    'total: z.number().int().min(0).default(0)',
    'correct: z.number().int().min(0).default(0)',
    'wrong: z.number().int().min(0).default(0)',
    'unanswered: z.number().int().min(0).default(0)',
    'score: z.number().min(0).max(100).default(0)',
  ]) assert.ok(schemaSource.includes(fragment), `quiz submit schema missing ${fragment}`);
});

check('submission parser and type call sites remain route-owned', () => {
  for (const fragment of [
    'questionAttemptSchema.parse(req.body)',
    'quizSubmitSchema.parse(req.body)',
    'payload: z.infer<typeof quizSubmitSchema>',
  ]) assert.ok(routeSource.includes(fragment), `quiz route submission call missing ${fragment}`);
});

check('submission HTTP route surface remains stable', () => {
  for (const fragment of ['"/question-attempts"', '"/:id/submit"']) {
    assert.ok(routeSource.includes(fragment), `quiz submission route missing ${fragment}`);
  }
});

check('submission schema ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const questionAttemptSchema = z.object({',
    'const quizSubmitSchema = z.object({',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'pre-apply'} ownership mismatch for ${declaration}`);
  }
});

check('delegated submission schema import is singular and remains with transport imports', () => {
  if (!delegated) return;
  assert.equal(routeSource.split(schemaImport).length - 1, 1, 'submission schema import must be singular');
  const importIndex = routeSource.indexOf(schemaImport);
  const stateIndex = routeSource.indexOf('const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;');
  assert.ok(importIndex >= 0 && stateIndex >= 0 && importIndex < stateIndex, 'submission schema import must precede route-local state');
});

check('submission security, scoring, persistence and side effects remain route-owned', () => {
  for (const fragment of [
    'const getQuizMaxAttempts =',
    'const getQuizPassingScore =',
    'const assertQuizWindowIsOpen =',
    'const buildSubmissionKey =',
    'const canSubmitQuiz = async',
    'QuestionAttemptModel.create({',
    'QuizResultModel.countDocuments({',
    'QuizResultModel.create({',
    'updateSkillProgressFromQuestionAttempt(created',
    'runQuizSubmissionSideEffects({',
    'const matchingGroup = await GroupModel.findOne({',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost submission behavior ownership: ${fragment}`);
});

check('submission schema module stays transport-only and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'QuestionAttemptModel', 'QuizResultModel', 'GroupModel', 'assertQuizWindowIsOpen',
    'getQuizMaxAttempts', 'getQuizPassingScore', 'buildSubmissionKey', 'canSubmitQuiz', 'runQuizSubmissionSideEffects',
  ]) assert.ok(!schemaSource.includes(forbidden), `submission schema module must not include ${forbidden}`);
  assert.ok(lineCount(schemaSource) <= 50, `submissionSchemas.ts exceeded 50 lines (${lineCount(schemaSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-submission-schema-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  schemaLines: lineCount(schemaSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
