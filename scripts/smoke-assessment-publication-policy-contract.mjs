import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const policySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizPublicationPolicy.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('publication policy is delegated from the create route', () => {
  assert.ok(routeSource.includes('import { resolveQuizPublicationState } from "../modules/quizzes/application/quizPublicationPolicy.js";'));
  assert.ok(routeSource.includes('resolveQuizPublicationState({'));
  assert.ok(!routeSource.includes('const isPowerRole ='));
});

check('power-role and question-default semantics remain explicit', () => {
  for (const fragment of [
    'export const isQuizPowerRole',
    'role === "admin" || role === "supervisor"',
    'typeof requestedPublished === "boolean" ? requestedPublished : hasQuestions',
    'if (!isQuizPowerRole(role)) return false',
  ]) assert.ok(policySource.includes(fragment), `publication policy missing ${fragment}`);
});

check('publication policy does not own persistence or authorization', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'requireRole', 'process.env']) {
    assert.ok(!policySource.includes(forbidden), `publication policy must not include ${forbidden}`);
  }
  assert.ok(policySource.split(/\r?\n/).length <= 40, 'quizPublicationPolicy.ts exceeded 40 lines');
});

check('create route retains publication integrity and persistence orchestration', () => {
  for (const fragment of ['if (willBePublished)', 'validateQuizQuestionIntegrity(payload)', 'QuizModel.create(buildQuizCreateDocument({']) {
    assert.ok(routeSource.includes(fragment), `create route lost ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-publication-policy', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
