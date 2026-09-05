import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionDirectedScope.ts'), 'utf8').replace(/\r\n/g, '\n');
const integrationGateSource = fs.readFileSync(path.join(root, 'server/src/scripts/backendIntegrationGate.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('directed submission scope is delegated while database verification stays in the route', () => {
  assert.ok(routeSource.includes('import { buildQuizSubmissionDirectedScope } from "../modules/quizzes/application/quizSubmissionDirectedScope.js";'));
  assert.ok(routeSource.includes('const directedScope = buildQuizSubmissionDirectedScope({'));
  assert.ok(routeSource.includes('if (directedScope.requiresGroupMembershipCheck) {'));
  assert.ok(routeSource.includes('GroupModel.findOne({'));
  assert.ok(routeSource.includes('message: "This quiz is not assigned to you"'));
});

check('directed scope conditions remain explicit', () => {
  for (const fragment of ['targetGroupIds', 'targetUserIds', 'isDirectedQuiz', 'isExplicitUser', 'isDirectedQuiz && !isStaff && !isExplicitUser && targetGroupIds.length > 0']) {
    assert.ok(moduleSource.includes(fragment), `directed scope missing ${fragment}`);
  }
});

check('directed scope stays pure and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'GroupModel', 'QuizModel', 'QuestionModel', 'QuizResultModel', 'requireRole', 'process.env']) {
    assert.ok(!moduleSource.includes(forbidden), `directed scope must not include ${forbidden}`);
  }
  assert.ok(moduleSource.split(/\r?\n/).length <= 40, 'quizSubmissionDirectedScope.ts exceeded 40 lines');
});

check('isolated HTTP gate rejects directed targets outside both class and school scope', () => {
  for (const fragment of [
    'scopeStudentIds = new Map<"assigned" | "sibling" | "outsideSchool", string>()',
    'Platform V3 integration outside-school student',
    'class supervisor cannot target a sibling-class student',
    'school supervisor cannot target another school\'s student',
    'targetUserIds: [outsideSchoolStudentId]',
    'schoolSupervisorOutsideTarget, 403',
  ]) {
    assert.ok(integrationGateSource.includes(fragment), `isolated directed-scope gate missing ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-directed-scope-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
