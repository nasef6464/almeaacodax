import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionQuestions.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission question resolver is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuizQuestionLookup, resolveOrderedQuizQuestions } from "../modules/quizzes/application/quizSubmissionQuestions.js";'));
  assert.ok(routeSource.includes('const orderedQuestions = resolveOrderedQuizQuestions(questionIds, questions);'));
  assert.ok(routeSource.includes('const questionById = buildQuizQuestionLookup(questions);'));
  assert.ok(!routeSource.includes('questions.forEach((question) => {'));
});

check('question order and copy-suffix fallback remain explicit', () => {
  for (const fragment of ['export const buildQuizQuestionLookup', 'questionById.set(canonicalId, question)', 'replace(/_copy(?:_\\d+)?$/i, "")', 'questionById.get(id) || questionById.get(id.replace(/_copy(?:_\\d+)?$/i, ""))', '.map((questionId) =>']) {
    assert.ok(moduleSource.includes(fragment), `submission question resolver missing ${fragment}`);
  }
});

check('route retains question query and submission scoring ownership', () => {
  for (const fragment of ['QuestionModel.find(buildDocumentsByIdsQuery(questionIds))', 'if (orderedQuestions.length === 0)', 'buildQuizSubmissionAnswerReview({ orderedQuestions, answers: payload.answers })', 'QuizResultModel.create({']) {
    assert.ok(routeSource.includes(fragment), `submission route lost ${fragment}`);
  }
});

check('submission question resolver stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuestionAttemptModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `submission question resolver must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 35, 'quizSubmissionQuestions.ts exceeded 35 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-submission-question-resolution-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
