import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');

const reports=read('pages/Reports.tsx');
const scope=read('pages/Reports/studentReportScopeViewModel.ts');
const analytics=read('server/src/modules/quizzes/application/quizAnalyticsOverview.ts');
const resultRoutes=read('server/src/modules/quizzes/http/quizResultsRoutes.ts');
const dashboard=read('pages/Dashboard.tsx');
const supervisor=read('dashboards/admin/SupervisorDashboard.tsx');
const teacherRadar=read('components/classroom/ClassSkillGapsRadar.tsx');
const classroomVm=read('components/classroom/classroomReportViewModel.ts');
const smartPath=read('services/smartLearningPath.ts');

for (const token of ['selectedStudentPathId','selectedStudentSubjectId','selectedScopedPathId','selectedScopedSubjectId']) {
  assert.ok(reports.includes(token), `missing report filter ${token}`);
}
assert.ok(scope.includes('studentReportSubjectOptions'));
assert.ok(scope.includes("skill.subjectId === selectedStudentSubjectId"));
assert.ok(analytics.includes('selectedPathId'));
assert.ok(analytics.includes('selectedSubjectId'));
assert.ok(analytics.includes('matchesSelectedTaxonomyScope'));
assert.ok(resultRoutes.includes('buildResultTaxonomyScopeFilter'));
assert.ok(resultRoutes.includes('$elemMatch: { pathId: query.pathId, subjectId: query.subjectId }'));
assert.ok(dashboard.includes('كل مساراتي'));
assert.ok(dashboard.includes('كل المواد'));
assert.ok(supervisor.includes('skillPathFilter'));
assert.ok(supervisor.includes('skillSubjectFilter'));
assert.ok(supervisor.includes("String(sk.pathId || '')"));
assert.ok(supervisor.includes("String(sk.subjectId || '')"));
assert.ok(!teacherRadar.includes('DEFAULT_SKILLS_DATA'), 'teacher radar must not use demo taxonomy');
assert.ok(teacherRadar.includes('getClassroomTeacherHistory'));
assert.ok(teacherRadar.includes('selectedPathId'));
assert.ok(teacherRadar.includes('selectedSubjectId'));
assert.ok(classroomVm.includes("const scopeKey = [pathId, subjectId, skillId].join('::')"));
assert.ok(smartPath.includes('SMART_LEARNING_PATH_POLICY_VERSION'));
assert.ok(smartPath.includes('MAX_CACHE_ENTRIES = 50'));
assert.ok(!smartPath.includes('gemini'));
console.log(JSON.stringify({phase:'adaptive-phase5-smart-path-and-taxonomy-scope',status:'PASS'},null,2));
