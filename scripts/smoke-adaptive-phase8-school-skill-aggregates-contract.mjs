import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const evidence=read('server/src/models/SchoolSkillEvidence.ts');
const aggregate=read('server/src/models/SchoolSkillAggregate.ts');
const updater=read('server/src/modules/quizzes/application/schoolSkillReadModel.ts');
const sideEffects=read('server/src/modules/quizzes/application/quizSubmissionSideEffects.ts');
const schema=read('server/src/modules/quizzes/http/schoolSkillAggregateSchemas.ts');
const view=read('server/src/modules/quizzes/application/schoolSkillAggregateView.ts');
const routes=read('server/src/modules/quizzes/http/quizAnalyticsRoutes.ts');
const api=read('services/apiGroups/quizzesApi.ts');
const panel=read('pages/Reports/SchoolSkillAggregatePanel.tsx');
const reports=read('pages/Reports.tsx');
const domain=read('pages/Reports/reportDomain.ts');

assert.ok(evidence.includes('evidenceKey: { type: String, required: true, unique: true'));
assert.ok(evidence.includes('schoolId: 1'));
assert.ok(evidence.includes('classId: 1'));
assert.ok(evidence.includes('userId: 1'));
assert.ok(evidence.includes('pathId: 1'));
assert.ok(evidence.includes('subjectId: 1'));
assert.ok(evidence.includes('skillId: 1'));

assert.ok(aggregate.includes('{ unique: true }'));
assert.ok(aggregate.includes('recentMastery'));
assert.ok(aggregate.includes('confidence'));
assert.ok(aggregate.includes('trend'));

assert.ok(updater.includes('SchoolSkillEvidenceModel.bulkWrite'));
assert.ok(updater.includes('SchoolSkillAggregateModel.bulkWrite'));
assert.ok(updater.includes('evidenceKey'));
assert.ok(updater.includes('$lookup'), 'recent evidence must use a scoped indexed lookup');
assert.ok(updater.includes('Object.keys(groupId).map(field => ({ $eq:'), 'recent lookup must bind every scope dimension');
assert.ok(updater.includes('$sort: { occurredAt: -1 }'));
assert.ok(evidence.includes('occurredAt: -1'));
assert.ok(updater.includes('$limit: 5'), 'recent history remains capped at five');
assert.ok(updater.includes('if (!schoolId || !resultId || !userId) return []'));
assert.ok(sideEffects.includes('updateSchoolSkillReadModelFromResult(args.result, args.userId)'));

assert.ok(schema.includes('groupBy: z.enum(["skill", "class", "student"])'));
assert.ok(schema.includes('class/student drill-down requires pathId, subjectId and skillId'));

for (const role of ['"admin"','"supervisor"','"teacher"','"school_admin"']) {
  assert.ok(view.includes(role), `school aggregate staff scope lost ${role}`);
}
assert.ok(view.includes('resolveScopedStudentQuery'));
const scope=read('server/src/modules/quizzes/application/quizReportScope.ts');
const join=read('server/src/modules/quizzes/application/schoolSkillReportJoin.ts');
assert.ok(scope.includes('selectors.groupIds = options.classId'));
assert.ok(scope.includes('$and: [authorityFilter, selectors]'));
assert.ok(join.includes('$match: studentFilter'));
assert.ok(join.includes('foreignField: "userId"'));
assert.ok(aggregate.includes('schoolSkillAggregateSchema.index({ userId: 1 })'));
assert.ok(!view.includes('QuizResultModel'), 'new school read endpoint must not scan QuizResult');
assert.ok(!view.includes('QuestionAttemptModel'), 'new school read endpoint must not scan QuestionAttempt');
for (const metric of ['supportRate','coverage','confidence','trendBreakdown']) {
  assert.ok(view.includes(metric), `school aggregate view lost ${metric}`);
}

assert.ok(routes.includes('"/analytics/school-skills"'));
assert.ok(api.includes('getSchoolSkillAggregates'));
assert.ok(panel.includes("groupBy: 'skill'"));
assert.ok(panel.includes("groupBy: 'class'"));
assert.ok(panel.includes("groupBy: 'student'"));
assert.ok(panel.includes('scope?.isTruncated'));
assert.ok(reports.includes('SchoolSkillAggregatePanel'));
assert.ok(reports.includes('Role.SCHOOL_ADMIN'));
assert.ok(domain.includes("school_admin: 'نطاق المدرسة التابعة لك'"));

console.log(JSON.stringify({phase:'adaptive-phase8-school-skill-aggregates',status:'PASS'},null,2));
