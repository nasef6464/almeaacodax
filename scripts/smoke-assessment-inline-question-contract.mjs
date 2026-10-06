import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizInlineQuestions.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('inline question orchestration is delegated', () => {
  assert.ok(routeSource.includes('import { processInlineQuestions } from "../modules/quizzes/application/quizInlineQuestions.js";'));
  assert.ok(!routeSource.includes('const processInlineQuestions ='));
  assert.equal((routeSource.match(/processInlineQuestions\(/g) || []).length, 3);
});

check('inline question behavior remains explicit', () => {
  for (const fragment of [
    'typeof q === "string"',
    'q.id && !q.text && !q.options',
    'multiple_choice',
    'ownerId: String(authUser?.id || "")',
    'createdBy: String(authUser?.id || "")',
    'createQuestion({',
  ]) assert.ok(moduleSource.includes(fragment), `inline-question boundary missing ${fragment}`);
});

check('route retains database adapter and question attachment flow', () => {
  assert.ok(routeSource.includes('(document) => QuestionModel.create(document)'));
  assert.ok(routeSource.includes('payload.questionIds = uniqueStrings'));
  assert.ok(routeSource.includes('QuestionModel.create({'));
});

check('inline question boundary does not own HTTP or authorization', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'requireRole', 'QuizModel', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `inline-question boundary must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 85, 'quizInlineQuestions.ts exceeded 85 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-inline-question-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
