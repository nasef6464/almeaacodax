import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizAttemptContext.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('attempt context helpers are delegated', () => {
  assert.ok(routeSource.includes('import { buildSubmissionKey, getQuizMaxAttempts, getQuizPassingScore } from "../modules/quizzes/application/quizAttemptContext.js";'));
  assert.ok(!routeSource.includes('const getQuizMaxAttempts ='));
  assert.ok(!routeSource.includes('const getQuizPassingScore ='));
  assert.ok(!routeSource.includes('const buildSubmissionKey ='));
});

check('attempt limits, passing score, and idempotency key semantics remain explicit', () => {
  for (const fragment of [
    'quiz?.settings?.maxAttempts ?? 1',
    'Math.floor(value)',
    'quiz?.settings?.passingScore ?? 60',
    'Math.min(100, Math.max(0, value))',
    '`quiz-submit:${userId}:${quizId}:attempt:${attemptNumber}`',
  ]) assert.ok(moduleSource.includes(fragment), `attempt context missing ${fragment}`);
});

check('submission route retains attempt-limit and idempotency orchestration', () => {
  for (const fragment of ['const maxAttempts = getQuizMaxAttempts(quiz)', 'const attemptNumber = previousAttempts + 1', 'const submissionKey = buildSubmissionKey(req.authUser!.id, quizId, attemptNumber)', 'const passingScore = getQuizPassingScore(quiz)']) {
    assert.ok(routeSource.includes(fragment), `submission route lost ${fragment}`);
  }
});

check('attempt context module stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuestionAttemptModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `attempt context must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 35, 'quizAttemptContext.ts exceeded 35 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-attempt-context-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
