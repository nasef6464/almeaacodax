import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(path,'utf8');
const model=read('server/src/models/ReviewCard.ts');
const routes=read('server/src/routes/review.routes.ts');
const sideEffects=read('server/src/modules/quizzes/application/quizSubmissionSideEffects.ts');
const telemetry=read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const page=read('pages/ReviewSession.tsx');
const api=read('services/apiGroups/learningSupportApi.ts');
const panel=read('pages/Reports/StudentMasteryReviewPanel.tsx');
const reports=read('pages/Reports.tsx');

for (const fragment of ['pathId','subjectId','sectionId','reviewType','lastReviewEventId','skillIds']) {
  assert.ok(model.includes(fragment), `review model lost ${fragment}`);
}
assert.ok(model.includes('userId: 1, pathId: 1, subjectId: 1, nextReviewDate: 1'));
assert.ok(!model.includes('pathId: { type: String, default: "", index: true }'), 'avoid speculative single-field path index');
assert.ok(!model.includes('lastReviewEventId: { type: String, default: "", index: true }'), 'event id is not queried globally');

assert.ok(routes.includes('"/mastery-challenges"'));
assert.ok(routes.includes('validateRequiredReviewScope'));
assert.ok(routes.includes('selectedOptionIndex'));
assert.ok(routes.includes('eventId'));
assert.ok(routes.includes('lastReviewEventId: { $ne: eventId }'));
assert.ok(routes.includes('evidenceType: "mastery_review"'));
assert.ok(routes.includes('idempotent: true'));
assert.ok(!routes.includes('correctOptionIndex: Number('), 'review payload must not expose answer key');
assert.ok(routes.includes('.select("id text options imageUrl type skillIds")'));

assert.ok(sideEffects.includes('upsertReviewCardFromQuestionAttempt'));
assert.ok(sideEffects.includes('reviewType'));
assert.ok(sideEffects.includes('skillIds'));
assert.ok(telemetry.includes('upsertReviewCardFromQuestionAttempt'));

assert.ok(page.includes('useSearchParams'));
assert.ok(page.includes('eventIdsRef'));
assert.ok(page.includes('loading="lazy"'));
assert.ok(page.includes('تحقق وسجّل المراجعة'));

assert.ok(api.includes('getMasteryChallenges'));
assert.ok(api.includes('getReviewStats'));
assert.ok(api.includes('selectedOptionIndex'));

assert.ok(panel.includes('student-mastery-review-panel'));
assert.ok(panel.includes('api.getMasteryChallenges'));
assert.ok(panel.includes('api.getReviewStats'));
assert.ok(reports.includes('StudentMasteryReviewPanel'));
assert.ok(reports.includes("selectedStudentPathId !== 'all'"));
assert.ok(reports.includes("selectedStudentSubjectId !== 'all'"));

console.log(JSON.stringify({phase:'adaptive-phase7-mastery-review-v2',status:'PASS'},null,2));
