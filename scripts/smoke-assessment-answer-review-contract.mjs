import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionAnswerReview.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission answer review is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionAnswerReview } from "../modules/quizzes/application/quizSubmissionAnswerReview.js";'));
  assert.ok(routeSource.includes('buildQuizSubmissionAnswerReview({ orderedQuestions, answers: payload.answers });'));
  assert.ok(!routeSource.includes('const questionReview = orderedQuestions.map((question) => {'));
});

check('review fields, answer classification, and skill aggregation remain explicit', () => {
  for (const fragment of ['correctAnswers += 1;', 'wrongAnswers += 1;', 'unanswered += 1;', 'skillStats.set(skillId, current);', 'correctOptionIndex:', 'selectedOptionIndex,', 'explanation:', 'videoUrl:', 'imageUrl:', 'isCorrect,']) {
    assert.ok(moduleSource.includes(fragment), `answer review missing ${fragment}`);
  }
});

check('answer review stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `answer review must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 90, 'quizSubmissionAnswerReview.ts exceeded 90 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-answer-review-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
