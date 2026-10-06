import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionSectionResults.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission section results are delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionSectionResults } from "../modules/quizzes/application/quizSubmissionSectionResults.js";'));
  assert.ok(routeSource.includes('const sectionResults = buildQuizSubmissionSectionResults({'));
  assert.ok(!routeSource.includes('const secScore = secTotal > 0 ? Math.round((secCorrect / secTotal) * 100) : 0;'));
});

check('section result fields and answer policy remain explicit', () => {
  for (const fragment of ['quiz.mockExam?.enabled', 'sectionId:', 'sectionName:', 'total,', 'correct,', 'wrong,', 'unanswered,', 'selectedOptionIndex !== undefined && !answer.isCorrect', 'score: total > 0 ? Math.round((correct / total) * 100) : 0']) {
    assert.ok(moduleSource.includes(fragment), `section results missing ${fragment}`);
  }
});

check('section result builder stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `section results must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 80, 'quizSubmissionSectionResults.ts exceeded 80 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-section-results-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
