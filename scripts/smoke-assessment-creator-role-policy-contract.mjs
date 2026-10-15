import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const creatorPolicySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizCreatorRolePolicy.ts'), 'utf8').replace(/\r\n/g, '\n');
const accessPolicySource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizAccessPolicy.ts'), 'utf8').replace(/\r\n/g, '\n');
const teacherScopeSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/teacherAssessmentClassScope.ts'), 'utf8');
const backendGateSource = fs.readFileSync(path.join(root, '.github/workflows/platform-v3-backend-integration-gate.yml'), 'utf8');
const workflowSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizWorkflow.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('route delegates non-admin catalogue restrictions to creator policy', () => {
  for (const fragment of [
    'applyQuizCreatorRolePolicy',
    'hasDirectedQuizTargets',
    'assertTeacherDirectedQuizScope',
    'payload = applyQuizCreatorRolePolicy(req.authUser!, payload);',
  ]) assert.ok(routeSource.includes(fragment), `route missing ${fragment}`);

  const policyIndex = routeSource.indexOf('payload = applyQuizCreatorRolePolicy(req.authUser!, payload);');
  const inlineIndex = routeSource.indexOf('processInlineQuestions(req.body.questions');
  assert.ok(policyIndex >= 0 && inlineIndex > policyIndex, 'creator policy must execute before inline question persistence');
});

check('supervisor and directed-teacher assessments cannot become platform catalogue or paid content', () => {
  for (const fragment of [
    'authUser.role === "supervisor"',
    'authUser.role === "teacher" && hasDirectedQuizTargets(payload)',
    'showOnPlatform: false',
    'access: { type: "free" }',
    'learningPlacements: []',
  ]) assert.ok(creatorPolicySource.includes(fragment), `creator policy missing ${fragment}`);
});

check('teacher targets are constrained by active teaching assignments', () => {
  for (const fragment of [
    'resolveTeacherAssessmentClassIds(authUser,payload)',
    'Directed quiz targets classes outside teacher assignments',
    'Directed quiz targets students outside teacher assignments',
    'buildDocumentsByIdsQuery(allowedClassIds)',
  ]) assert.ok(accessPolicySource.includes(fragment), `teacher scope missing ${fragment}`);
  assert.match(teacherScopeSource,/TeachingAssignmentModel\.find\(\{teacherId:actorId,status:'active'\}\)/);
  for (const fragment of ['resolveSchoolDirectoryScope', 'subjects.every', 'a.classId===classId', 'String(group.parentId)===assignment.schoolId']) {
    assert.ok(teacherScopeSource.includes(fragment), `shared teacher authority missing ${fragment}`);
  }
  assert.ok(backendGateSource.includes('scripts/test-school-assessment-teacher-authority.ts'), 'behavioral class/subject/revocation gate must run in CI');
});

check('supervisor group escalation is rejected rather than silently filtered', () => {
  for (const fragment of [
    'const outsideGroupIds = targetGroupIds.filter((groupId) => !allowedGroupIds.has(groupId));',
    'Directed quiz targets groups outside supervisor scope',
    'Supervisor has no school or class scope for directed assessments',
  ]) assert.ok(accessPolicySource.includes(fragment), `supervisor scope missing ${fragment}`);
  assert.ok(!accessPolicySource.includes('targetGroupIds.filter((groupId) => allowedGroupIds.has(groupId))'), 'outside supervisor groups must not be silently dropped');
});

check('school-teacher directed writes use classroom authority instead of trainer managed-content authority', () => {
  for (const fragment of [
    'req.authUser?.role === "teacher" && hasDirectedQuizTargets(payload)',
    'if (!isTeacherDirectedAssessment) {',
    'await assertManagedContentScope(req.authUser!, payload);',
    'await assertTeacherDirectedQuizScope(req.authUser!, payload);',
  ]) assert.ok(routeSource.includes(fragment), `teacher directed route missing ${fragment}`);
});

check('workflow governance fields are admin-only', () => {
  assert.ok(workflowSource.includes('if (authUser.role !== "admin") {'));
  assert.ok(workflowSource.includes('if (authUser.role === "supervisor") {'));
  assert.ok(workflowSource.includes('delete nextPayload.approvalStatus;'));
  for (const field of ['ownerType', 'ownerId', 'createdBy', 'approvedBy', 'approvedAt', 'reviewerNotes', 'revenueSharePercentage']) {
    assert.ok(workflowSource.includes(`delete nextPayload.${field};`), `workflow must protect ${field}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'teacher-supervisor-assessment-phase1', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
