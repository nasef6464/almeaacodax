import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const moduleSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionDirectedScope.ts'), 'utf8').replace(/\r\n/g, '\n');
const integrationGateSource = fs.readFileSync(path.join(root, 'server/src/scripts/backendIntegrationGate.ts'), 'utf8').replace(/\r\n/g, '\n');
const accessSource=fs.readFileSync(path.join(root,'server/src/modules/quizzes/application/quizAccessPolicy.ts'),'utf8');
const liveSource=fs.readFileSync(path.join(root,'server/src/routes/live-exams.routes.ts'),'utf8');
const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('read, start and submit share fresh directed audience verification', () => {
  assert.ok(routeSource.includes('if (!(await canSubmitQuiz(quiz, authUser, payload.source)))'));
  assert.ok(accessSource.includes('const targeted = (await resolveDirectedQuizReadAccess(quiz,user)).allowed;'));
  assert.ok(accessSource.includes('const user = await resolveAuthUserByAuthId('));
  assert.ok(accessSource.includes('GroupModel.findOne({'));
  assert.ok(liveSource.includes('return (await resolveDirectedQuizReadAccess(quiz,authUser)).allowed;'));
  assert.ok(liveSource.includes('if (quiz.isPublished !== true) return false;'));
});

check('hidden school-directed assessments are visible only after server audience verification', () => {
  for (const fragment of [
    'const learnerAudienceUser =',
    'GroupModel.find({ studentIds: learnerId })',
    'const directedAudienceFilter = learnerId',
    '{ targetUserIds: learnerId }',
    '{ targetGroupIds: { $in: learnerAudienceIds } }',
    '{ showOnPlatform: { $ne: false } }',
    '...(directedAudienceFilter ? [directedAudienceFilter] : [])',
    '...(learnerAudienceRecord?.schoolId ? [String(learnerAudienceRecord.schoolId)] : [])',
  ]) {
    assert.ok(routeSource.includes(fragment), `hidden directed catalogue contract missing ${fragment}`);
  }
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
    'showOnPlatform: false',
    'hidden school-directed assessment was missing from its target student catalogue',
    'outside student cannot submit hidden school-directed assessment',
    'supervisor persists the selected directed-assessment attempt limit',
    'targeted student receives the supervisor-selected second attempt',
    'third submission is rejected after the supervisor-selected limit',
  ]) {
    assert.ok(integrationGateSource.includes(fragment), `isolated directed-scope gate missing ${fragment}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-directed-scope-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
