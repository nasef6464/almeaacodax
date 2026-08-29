import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const workflowSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizWorkflow.ts'), 'utf8').replace(/\r\n/g, '\n');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('workflow functions are delegated from the route', () => {
  assert.ok(routeSource.includes('import { getWorkflowDefaults, sanitizeWorkflowUpdate } from "../modules/quizzes/application/quizWorkflow.js";'));
  assert.ok(!routeSource.includes('const getWorkflowDefaults ='));
  assert.ok(!routeSource.includes('const sanitizeWorkflowUpdate ='));
  assert.ok(routeSource.includes('getWorkflowDefaults(req.authUser!)'));
  assert.ok(routeSource.includes('sanitizeWorkflowUpdate('));
});

check('workflow ownership and role semantics remain explicit', () => {
  for (const fragment of [
    'export const getWorkflowDefaults',
    'export const sanitizeWorkflowUpdate',
    'ownerType: "platform"',
    'ownerType: "school"',
    'ownerType: "teacher"',
    'approvalStatus: "pending_review"',
    'nextPayload.isPublished = false',
  ]) assert.ok(workflowSource.includes(fragment), `workflow boundary missing ${fragment}`);
});

check('workflow module stays application-only and bounded', () => {
  for (const forbidden of ['express', 'mongoose', 'Router(', 'req.', 'res.', 'QuizModel', 'QuestionModel', 'process.env']) {
    assert.ok(!workflowSource.includes(forbidden), `workflow module must not include ${forbidden}`);
  }
  assert.ok(workflowSource.split(/\r?\n/).length <= 120, 'quizWorkflow.ts exceeded 120 lines');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-workflow-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
