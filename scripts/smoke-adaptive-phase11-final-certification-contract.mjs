import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const required=[
'scripts/smoke-adaptive-mastery-evidence-contract.mjs',
'scripts/smoke-adaptive-phase5-next-best-action-contract.mjs',
'scripts/smoke-adaptive-phase6-mastery-readiness-contract.mjs',
'scripts/smoke-adaptive-phase9-question-assistant-contract.mjs',
'scripts/smoke-adaptive-phase10-resource-hardening-contract.mjs',
'scripts/smoke-global-student-journey-contract.mjs',
'scripts/smoke-reports-student-analytics-boundary-contract.mjs',
'scripts/smoke-reports-recommendation-boundary-contract.mjs',
'scripts/smoke-adaptive-skill-progress-performance-contract.mjs',
'scripts/smoke-adaptive-telemetry-http-boundary-contract.mjs'];
required.forEach((p)=>assert.ok(fs.existsSync(p),`missing required Phase 11 artifact: ${p}`));
const mastery=read('server/src/modules/quizzes/http/adaptiveMasteryRoutes.ts');
const progress=read('server/src/modules/quizzes/application/quizSubmissionSkillProgress.ts');
const reports=read('pages/Reports.tsx');
const path=read('components/SmartLearningPath.tsx');
const adaptivePath=read('services/adaptiveLearningPathService.ts');
const foundationTarget=read('utils/foundationSkillTarget.ts');
const results=read('pages/Results.tsx');
const ai=read('server/src/routes/ai.routes.ts');
const review=read('server/src/models/ReviewCard.ts');
const school=read('server/src/modules/quizzes/application/schoolSkillAggregateView.ts');
for(const token of ['pathId','subjectId']){assert.ok(mastery.includes(token));assert.ok(reports.includes(token));}
assert.ok(progress.includes('bulkWrite'));
assert.ok(progress.includes('recentEvidenceKeys'));
assert.ok(results.includes('QuestionAssistantPanel'));
assert.ok(ai.includes('imageSentToProvider: false'));
assert.ok(ai.includes('withinAiBudget'));
assert.ok(path.includes('getNextBestAction'));
assert.ok(path.includes('resolveFoundationSkillTarget'));
assert.ok(path.includes('topicId: target.topicId'));
assert.ok(adaptivePath.includes("buildFoundationActionLink(scope, 'quizzes')"));
assert.ok(foundationTarget.includes('topic.skillId'));
assert.ok(review.includes('nextReviewDate'));
assert.ok(!school.includes('QuizResultModel'));
assert.ok(!school.includes('QuestionAttemptModel'));
console.log(JSON.stringify({phase:'adaptive-phase11-final-certification',status:'PASS'},null,2));
