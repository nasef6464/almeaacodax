import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const policy=read('services/masteryPolicy.ts');
const server=read('server/src/modules/quizzes/analytics/masteryReadiness.ts');
const routes=read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const model=read('server/src/models/MasteryGoal.ts');
const api=read('services/apiGroups/quizzesApi.ts');
const reports=read('pages/Reports.tsx');
const readiness=read('pages/Reports/studentReadinessViewModel.ts');
const skillRows=read('pages/Reports/studentSkillRowsViewModel.ts');

for (const fragment of ['foundation: 50','proficient: 75','mastered: 90','minEvidence: 3']) {
  assert.ok(policy.includes(fragment), `mastery policy lost ${fragment}`);
}
assert.ok(policy.includes('safeMastery * 0.55'));
assert.ok(policy.includes('safeCoverage * 100 * 0.2'));
assert.ok(policy.includes('evidenceConfidence * 100 * 0.15'));
assert.ok(policy.includes('recency * 100 * 0.1'));
assert.ok(server.includes('buildScopedMasteryReadiness'));
assert.ok(routes.includes('"/mastery-readiness"'));
assert.ok(routes.includes('"/mastery-goals"'));
assert.ok(routes.includes('resolveMasteryGoalTargetUserId'));
assert.ok(routes.includes('assertMasteryTaxonomyScope'));
assert.ok(routes.includes('Subject does not belong to the selected path'));
assert.ok(model.includes('targetType: { type: String, enum: ["topic", "section", "path"]'));
assert.ok(model.includes('horizon: { type: String, enum: ["short", "long"]'));
assert.ok(api.includes('getMasteryReadiness'));
assert.ok(api.includes('getMasteryGoals'));
assert.ok(api.includes('createMasteryGoal'));
assert.ok(api.includes('updateMasteryGoal'));
assert.ok(reports.includes('api.getMasteryReadiness'));
assert.ok(reports.includes('StudentMasteryGoalsPanel'));
assert.ok(reports.includes('selectedStudentSubjectId'));
assert.ok(reports.includes('studentReportSubjectOptions'));
assert.ok(readiness.includes('serverReadiness?.status || localReadiness.status'));
assert.ok(skillRows.includes('resolveMasteryLevel'));
assert.ok(skillRows.includes('buildSkillRecheckActionLink'));
console.log(JSON.stringify({phase:'adaptive-phase6-mastery-readiness',status:'PASS'},null,2));
