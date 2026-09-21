import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const skillModel = read('server/src/models/SkillProgress.ts');
const skillAnalytics = read('server/src/modules/quizzes/analytics/skillAnalytics.ts');
const sideEffects = read('server/src/modules/quizzes/application/quizSubmissionSideEffects.ts');
const skillProgressSideEffects = read('server/src/modules/quizzes/application/quizSubmissionSkillProgress.ts');
const telemetry = read('server/src/modules/quizzes/http/adaptiveTelemetryRoutes.ts');
const studentAnalytics = read('pages/Reports/studentAnalyticsViewModel.ts');
const reportTypes = read('pages/Reports/reportTypes.ts');
const quizApi = read('services/apiGroups/quizzesApi.ts');
const aiPolicy = read('server/src/modules/ai/application/questionAssistant.ts');
const aiRoute = read('server/src/routes/ai.routes.ts');
const indexMigration = read('server/src/scripts/ensureAdaptiveMasteryIndexes.ts');
const reviewModel = read('server/src/models/ReviewCard.ts');
const schoolView = read('server/src/modules/quizzes/application/schoolSkillAggregateView.ts');

assert.ok(skillModel.includes('{ userId: 1, pathId: 1, subjectId: 1, skillId: 1 }, { unique: true }'));
assert.ok(skillModel.includes('recentEvidence:'));
assert.ok(skillModel.includes('recentEvidenceKeys'));
assert.ok(skillModel.includes('{ userId: 1, pathId: 1, subjectId: 1, mastery: 1, lastAttemptAt: -1 }'));

assert.ok(skillAnalytics.includes('DEFAULT_RECENT_EVIDENCE_WINDOW = 5'));
assert.ok(skillAnalytics.includes('mergeRecentSkillEvidence'));
assert.ok(skillAnalytics.includes('summarizeRecentSkillEvidence'));
assert.ok(skillAnalytics.includes('.slice(0, boundedWindow)'));

assert.ok(skillProgressSideEffects.includes('SkillProgressModel.bulkWrite'));
assert.ok(skillProgressSideEffects.includes('skillProgressScopeKey'));
assert.ok(sideEffects.includes('updateSkillProgressFromResult'));
assert.ok(skillProgressSideEffects.includes('boundedReplayKeys'));
assert.ok(skillProgressSideEffects.includes('filter: { userId, pathId, subjectId, skillId }'));
assert.ok(skillProgressSideEffects.includes('recentEvidenceKeys: replay.keys'));
assert.ok(skillProgressSideEffects.includes('mergeRecentSkillEvidence'));
assert.ok(!skillProgressSideEffects.includes('Promise.all(\n    skillsAnalysis'), 'per-skill N+1 regression returned');

assert.ok(telemetry.includes('const pathId = String(req.query.pathId'));
assert.ok(telemetry.includes('const subjectId = String(req.query.subjectId'));
assert.ok(telemetry.includes('summarizeRecentSkillEvidence'));
assert.ok(telemetry.includes('"school_admin"'));

assert.ok(studentAnalytics.includes('weightedMasteryTotal'));
assert.ok(studentAnalytics.includes('questionCount'));
assert.ok(studentAnalytics.includes('correctCount'));
assert.ok(studentAnalytics.includes('.slice(0, 5)'));
assert.ok(studentAnalytics.includes("String(pathId || '')"));
assert.ok(studentAnalytics.includes("String(subjectId || '')"));
assert.ok(studentAnalytics.includes('if (skillsMap[key]?.hasResultEvidence) return'));
assert.ok(studentAnalytics.includes('recentMastery'));
assert.ok(studentAnalytics.includes('confidence'));
assert.ok(studentAnalytics.includes('trend'));

for (const field of ['recentMastery','trend','confidence','recentEvidence','recentSampleSize']) {
  assert.ok(reportTypes.includes(field), `student report type lost ${field}`);
}
assert.ok(quizApi.includes('pathId?: string; subjectId?: string'));

assert.ok(aiPolicy.includes('sanitizeQuestionAssistantText'));
assert.ok(aiPolicy.includes('[صورة غير مرسلة]'));
assert.ok(aiPolicy.includes('[رابط صورة محجوب]'));
assert.ok(aiRoute.includes('imageSentToProvider: false'));
assert.ok(aiRoute.includes('callAiWithMeta(prompt, undefined, undefined'));

assert.ok(reviewModel.includes('{ userId: 1, pathId: 1, subjectId: 1, nextReviewDate: 1 }'));
assert.ok(!schoolView.includes('QuizResultModel'));
assert.ok(!schoolView.includes('QuestionAttemptModel'));

assert.ok(indexMigration.includes('DRY RUN ONLY'));
assert.ok(indexMigration.includes('--apply'));
assert.ok(indexMigration.includes('--drop-legacy'));
assert.ok(indexMigration.includes('duplicateScoped'));
assert.ok(indexMigration.includes('missingScope'));
assert.ok(indexMigration.includes('unique: true'));
assert.ok(indexMigration.includes('Refusing to drop legacy identity'));

console.log(JSON.stringify({
  phase: 'adaptive-phase10-resource-hardening',
  status: 'PASS',
}, null, 2));
