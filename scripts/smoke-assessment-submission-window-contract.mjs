import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionWindow.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('submission window policy is delegated and response mapping stays in the route', () => {
  assert.ok(routeSource.includes('import { assertQuizSubmissionWindow } from "../modules/quizzes/application/quizSubmissionWindow.js";'));
  assert.ok(routeSource.includes('const quizWindow = assertQuizSubmissionWindow({'));
  assert.ok(routeSource.includes('if (quizWindow.ok === false) {'));
  assert.ok(routeSource.includes('return res.status(quizWindow.status).json({ message: quizWindow.message });'));
  assert.ok(!routeSource.includes('const assertQuizWindowIsOpen ='));
});

check('deadline and time-limit semantics remain explicit', () => {
  for (const fragment of ['quiz?.dueDate', 'now > dueDateMs', 'Quiz submission deadline has passed', 'quiz?.settings?.timeLimit ?? 0', 'Math.ceil(timeLimitMinutes * 60) + 60', 'Quiz time limit exceeded']) {
    assert.ok(moduleSource.includes(fragment), `submission window missing ${fragment}`);
  }
});

check('submission window stays bounded and has no route or persistence dependency', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `submission window must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 55, 'quizSubmissionWindow.ts exceeded 55 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-submission-window-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
