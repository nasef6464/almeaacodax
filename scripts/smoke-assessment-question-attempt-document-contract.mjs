import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/questionAttemptDocument.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('question-attempt document builder is delegated', () => {
  assert.ok(routeSource.includes('import { buildQuestionAttemptDocument } from "../modules/quizzes/application/questionAttemptDocument.js";'));
  assert.ok(routeSource.includes('QuestionAttemptModel.create(buildQuestionAttemptDocument({'));
  assert.ok(!routeSource.includes('QuestionAttemptModel.create({\n      ...payload'));
});

check('attempt document preserves correctness and question context', () => {
  for (const fragment of ['...payload,', 'selectedOptionIndex,', 'isCorrect,', 'userId,', 'date: payload.date || new Date().toISOString()', 'pathId: String(question?.pathId || "")', 'skillIds: Array.isArray(question?.skillIds)']) {
    assert.ok(moduleSource.includes(fragment), `attempt document missing ${fragment}`);
  }
});

check('route retains question lookup, correctness calculation, and progress update', () => {
  for (const fragment of ['QuestionModel.findOne(buildDocumentQuery(payload.questionId))', 'const isCorrect =', 'await updateSkillProgressFromQuestionAttempt(created, req.authUser!.id)', 'res.status(StatusCodes.CREATED).json(created)']) {
    assert.ok(routeSource.includes(fragment), `attempt route lost ${fragment}`);
  }
});

check('attempt document builder stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuestionAttemptModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `attempt document must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 35, 'questionAttemptDocument.ts exceeded 35 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-question-attempt-document-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
