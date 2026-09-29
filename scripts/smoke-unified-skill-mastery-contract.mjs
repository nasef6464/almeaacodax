import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const files = {
  readModel: read('server/src/modules/quizzes/application/quizSubmissionReadModelContext.ts'),
  skillProgressWriter: read('server/src/modules/quizzes/application/quizSubmissionSkillProgress.ts'),
  masteryProjection: read('server/src/modules/quizzes/application/skillMasteryProjection.ts'),
  telemetry: read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts'),
  parentRoutes: read('server/src/routes/parent.routes.ts'),
  schoolReadModel: read('server/src/modules/quizzes/application/schoolSkillReadModel.ts'),
  schoolView: read('server/src/modules/quizzes/application/schoolSkillAggregateView.ts'),
  reports: read('pages/Reports.tsx'),
  reportProjection: read('pages/Reports/skillProgressReportProjection.ts'),
  dashboard: read('pages/Dashboard.tsx'),
  recommendation: read('pages/Reports/recommendationViewModel.ts'),
  selectedSkillPanel: read('pages/Reports/StudentSelectedSkillPanel.tsx'),
  reconcile: read('server/src/scripts/reconcileSkillProgressTaxonomy.ts'),
};

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('1 result evidence uses exact canonical main/subskill fields', () => {
  assert.ok(files.readModel.includes('question?.skillId'));
  assert.ok(files.readModel.includes('question?.subSkillId'));
  assert.ok(files.readModel.includes('canonical.length > 0'));
});

check('2 SkillProgress persists and reads canonical hierarchy', () => {
  for (const token of ['level:', 'parentSkillId:', 'parentSkill:']) assert.ok(files.skillProgressWriter.includes(token));
  assert.ok(files.masteryProjection.includes('buildSkillTaxonomyProjection'));
  assert.ok(files.masteryProjection.includes('unresolvedTaxonomy: false'));
  assert.ok(files.telemetry.includes('projectSkillProgressRows'));
});

check('3 historical reconciliation is dry-run by default and never mutates mastery/evidence', () => {
  assert.ok(files.reconcile.includes('const APPLY = process.argv.includes("--apply")'));
  assert.ok(files.reconcile.includes('mode: APPLY ? "apply" : "dry-run"'));
  assert.ok(files.reconcile.includes('masteryChanged: false'));
  assert.ok(files.reconcile.includes('evidenceChanged: false'));
  assert.ok(files.reconcile.includes('unresolvedRowsChanged: false'));
  const updateBlock = files.reconcile.slice(files.reconcile.indexOf('$set: {'), files.reconcile.indexOf('},\n            },', files.reconcile.indexOf('$set: {')));
  assert.ok(!updateBlock.includes('mastery:'));
  assert.ok(!updateBlock.includes('evidenceCount:'));
  assert.ok(!updateBlock.includes('attempts:'));
});

check('4 student reports use SkillProgress as mastery truth', () => {
  assert.ok(files.reports.includes('api.getSkillProgress(scope)'));
  assert.ok(files.reports.includes('buildStudentSkillsFromProgress(studentSkillProgress'));
  assert.ok(files.reportProjection.includes('.filter((row) => !row.unresolvedTaxonomy'));
  assert.ok(files.reportProjection.includes('Boolean(String(row.skillId || \'\').trim())'));
});

check('5 Smart Learning Path and overview use SkillProgress, not exam result aggregation', () => {
  assert.ok(files.dashboard.includes('buildSmartPathSkillsFromProgress'));
  assert.ok(files.dashboard.includes('useStudentSkillProgress'));
  assert.ok(files.dashboard.includes('api.getSkillProgress'));
  assert.ok(!files.dashboard.includes('buildSmartPathSkillsFromResults'));
});

check('6 parent progress and weekly reports use child SkillProgress', () => {
  assert.ok(files.parentRoutes.includes('SkillProgressModel.find'));
  assert.ok(files.parentRoutes.includes('projectSkillProgressRows'));
  assert.ok(files.parentRoutes.includes('weakSkillDetails'));
  assert.ok(files.reports.includes('parentChildrenProgress'));
  assert.ok(files.dashboard.includes('parentProgress'));
});

check('7 teacher/supervisor reports use canonical SchoolSkillAggregate truth', () => {
  assert.ok(files.schoolReadModel.includes('parentSkillId'));
  assert.ok(files.schoolView.includes('buildSkillTaxonomyProjection'));
  assert.ok(files.reports.includes("api.getSchoolSkillAggregates({"));
  assert.ok(files.reports.includes("groupBy: 'skill'"));
  assert.ok(files.reports.includes('staffSkillAggregates'));
});

check('8 unified source preserves existing role-scoped boundaries', () => {
  assert.ok(files.telemetry.includes('userId: req.authUser!.id'));
  assert.ok(files.parentRoutes.includes('linkedStudentIds'));
  assert.ok(files.parentRoutes.includes('SkillProgressModel.find'));
  assert.ok(files.schoolView.includes('resolveScopedStudents'));
});

check('student report skill actions stay inside exact Foundation mapping', () => {
  assert.ok(files.recommendation.includes("buildFoundationActionLink(actionContext, 'lessons')"));
  assert.ok(files.recommendation.includes("buildFoundationActionLink(actionContext, 'quizzes')"));
  assert.ok(files.recommendation.includes("buildFoundationActionLink(actionContext, 'support')"));
  assert.ok(files.recommendation.includes('topic.quizIds'));
  assert.ok(files.selectedSkillPanel.includes('شرح/فيديو'));
  assert.ok(files.selectedSkillPanel.includes('تدريب المهارة في التأسيس'));
  assert.ok(files.selectedSkillPanel.includes('ملف الدعم'));
  assert.ok(files.selectedSkillPanel.includes('إعادة قياس المهارة'));
  assert.ok(files.selectedSkillPanel.includes('غير مرتبط بالتأسيس بعد'));
  assert.ok(!files.selectedSkillPanel.includes('to="/courses"'));
  assert.ok(!files.selectedSkillPanel.includes('/dashboard?tab=saher'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'unified-skill-mastery-1-8',
  status: failed.length ? 'FAIL' : 'PASS',
  total: checks.length,
  passed: checks.length - failed.length,
  failed,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
