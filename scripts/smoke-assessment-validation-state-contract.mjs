import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizValidationState.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('validation state composition is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizValidationState } from "../modules/quizzes/application/quizValidationState.js";'));
  assert.ok(routeSource.includes('const nextQuizState = buildQuizValidationState('));
  assert.ok(!routeSource.includes('const nextQuizState = {'));
});

check('validation state merge precedence remains explicit', () => {
  for (const fragment of ['...existing,', '...normalizedPayload,', '...sanitizedPayload,']) {
    assert.ok(moduleSource.includes(fragment), `validation state missing ${fragment}`);
  }
  assert.ok(routeSource.includes('validateQuizQuestionIntegrity(nextQuizState)'));
});

check('route retains persistence and response behavior', () => {
  assert.ok(routeSource.includes('QuizModel.findOneAndUpdate(documentQuery, sanitizedPayload, { new: true })'));
  assert.ok(routeSource.includes('return res.json(updated)'));
});

check('validation state builder stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `validation state must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 20, 'quizValidationState.ts exceeded 20 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-validation-state-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
