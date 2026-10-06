import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionResultDocument.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission result document is delegated while persistence stays in the route', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionResultDocument } from "../modules/quizzes/application/quizSubmissionResultDocument.js";'));
  assert.ok(routeSource.includes('QuizResultModel.create({'));
  assert.ok(routeSource.includes('...buildQuizSubmissionResultDocument({'));
  assert.ok(!routeSource.includes('timeSpent: timeSpentMinutes > 0 ? `${timeSpentMinutes} دقيقة` : "أقل من دقيقة",'));
});

check('result fields, time formatting, and optional section result policy remain explicit', () => {
  for (const fragment of ['timeSpentSeconds,', 'timeSpent:', 'date:', '...(sectionResults ? { sectionResults } : {})', 'Math.max(0, Math.round(timeSpentSeconds / 60))']) {
    assert.ok(moduleSource.includes(fragment), `result document missing ${fragment}`);
  }
});

check('result document stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `result document must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 65, 'quizSubmissionResultDocument.ts exceeded 65 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-result-document-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
