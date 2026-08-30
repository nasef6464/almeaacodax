import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionScoreSummary.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission score summary is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionScoreSummary } from "../modules/quizzes/application/quizSubmissionScoreSummary.js";'));
  assert.ok(routeSource.includes('const scoreSummary = buildQuizSubmissionScoreSummary({'));
  assert.ok(routeSource.includes('const { totalQuestions, score, passed } = scoreSummary;'));
  assert.ok(!routeSource.includes('const score = Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100);'));
});

check('score math and result fields remain explicit', () => {
  for (const fragment of ['Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100)', 'totalQuestions,', 'correctAnswers,', 'wrongAnswers,', 'unanswered,', 'passed: score >= passingScore']) {
    assert.ok(moduleSource.includes(fragment), `score summary missing ${fragment}`);
  }
});

check('route retains review, persistence, and side-effect ownership', () => {
  for (const fragment of ['const questionReview = orderedQuestions.map', 'const skillsAnalysis = Array.from(skillStats.entries())', 'QuizResultModel.create({', 'passed,', 'await runQuizSubmissionSideEffects({']) {
    assert.ok(routeSource.includes(fragment), `submission route lost ${fragment}`);
  }
});

check('score summary stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `score summary must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 40, 'quizSubmissionScoreSummary.ts exceeded 40 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-score-summary-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
