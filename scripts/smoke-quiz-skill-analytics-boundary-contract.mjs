import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const analyticsRouteSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/http/quizAnalyticsRoutes.ts'), 'utf8').replace(/\r\n/g, '\n');
const overviewSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizAnalyticsOverview.ts'), 'utf8').replace(/\r\n/g, '\n');
const weakestStudentsSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizAnalyticsWeakestStudents.ts'), 'utf8').replace(/\r\n/g, '\n');
const sideEffectsSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionSideEffects.ts'), 'utf8').replace(/\r\n/g, '\n');
const skillsAnalysisSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/application/quizSubmissionSkillsAnalysis.ts'), 'utf8').replace(/\r\n/g, '\n');
const analyticsSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/analytics/skillAnalytics.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('recommended action thresholds and Arabic guidance are preserved', () => {
  for (const fragment of [
    'if (mastery < 45)',
    '"خطة علاج عاجلة: شرح + تدريب + اختبار موجه"',
    'if (mastery < 65)',
    'attemptCount >= 3 ? "زيادة التدريب ثم اختبار ساهر علاجي" : "إضافة تدريب قصير ومتابعة الأداء"',
    '"تثبيت المهارة بتدريب خفيف وإعادة قياس لاحقًا"',
  ]) assert.ok(analyticsSource.includes(fragment), `recommended action helper missing ${fragment}`);
});

check('skill progress status thresholds are preserved', () => {
  for (const fragment of [
    'if (mastery >= 90) return "mastered";',
    'if (mastery >= 75) return "good";',
    'if (mastery >= 50) return "average";',
    'return "weak";',
  ]) assert.ok(analyticsSource.includes(fragment), `skill status helper missing ${fragment}`);
});

check('quiz result skill status thresholds are preserved', () => {
  for (const fragment of [
    'if (mastery >= 80) return "strong";',
    'if (mastery >= 50) return "average";',
  ]) assert.ok(analyticsSource.includes(fragment), `result skill status helper missing ${fragment}`);
});

check('skill recommendation thresholds and learner guidance are preserved', () => {
  for (const fragment of [
    'if (mastery < 50) return "راجع شرحًا قصيرًا ثم حل تدريبًا موجّهًا على نفس المهارة";',
    'if (mastery < 80) return "أداؤك قريب من الإتقان. زد التدريب قليلًا ثم أعد القياس";',
    'return "أداء ممتاز. حافظ على المهارة بتدريب خفيف من وقت لآخر";',
  ]) assert.ok(analyticsSource.includes(fragment), `skill recommendation helper missing ${fragment}`);
});

check('skill-progress side effects call the shared analytics helpers', () => {
  for (const fragment of [
    'status: buildSkillStatus(nextMastery)',
    'recommendedAction: buildRecommendedAction(nextMastery, nextAttempts)',
    'SkillProgressModel.findOne({ userId, skillId })',
    'SkillProgressModel.findOneAndUpdate(',
  ]) assert.ok(sideEffectsSource.includes(fragment), `skill progress side effects lost ${fragment}`);
});

check('quiz-result skill analysis calls the shared status and recommendation helpers', () => {
  for (const fragment of [
    'const status = buildResultSkillStatus(mastery);',
    'recommendation: buildSkillRecommendation(mastery)',
  ]) assert.ok(skillsAnalysisSource.includes(fragment), `quiz skill analysis lost ${fragment}`);
});

check('analytics evidence policy remains explicit and shared across projections', () => {
  for (const fragment of [
    'export const MIN_ANALYTICS_SKILL_EVIDENCE_COUNT = 3;',
    '(item) => item.count >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
    'evidenceThreshold: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
  ]) assert.ok(weakestStudentsSource.includes(fragment), `weakest-student evidence policy lost ${fragment}`);

  for (const fragment of [
    '.filter((item) => item.attempts >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT)',
    'minSkillEvidence: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
    'recommendedAction: buildRecommendedAction(mastery, item.attempts)',
  ]) assert.ok(overviewSource.includes(fragment), `overview evidence policy lost ${fragment}`);
});

check('analytics overview database orchestration moved out of the root router without behavior loss', () => {
  for (const fragment of [
    'QuestionAttemptModel.find(',
    'QuizResultModel.find(',
    'const weakestSkills = Array.from(weakSkillMap.values())',
    'buildWeakestStudentSummaries({',
  ]) assert.ok(overviewSource.includes(fragment), `analytics overview lost ${fragment}`);

  assert.ok(analyticsRouteSource.includes('"/analytics/overview"'));
  assert.ok(analyticsRouteSource.includes('buildQuizAnalyticsOverview('));
  assert.ok(routeSource.includes('quizRouter.use(quizAnalyticsRouter);'));
  assert.ok(!routeSource.includes('quizRouter.get(\n  "/analytics/overview"'));
});

check('analytics modules stay bounded by responsibility', () => {
  assert.ok(lineCount(analyticsRouteSource) <= 60, `quizAnalyticsRoutes.ts exceeded 60 lines (${lineCount(analyticsRouteSource)}).`);
  assert.ok(lineCount(overviewSource) < 400, `quizAnalyticsOverview.ts became a hotspot (${lineCount(overviewSource)} lines).`);
  assert.ok(lineCount(weakestStudentsSource) <= 180, `quizAnalyticsWeakestStudents.ts exceeded 180 lines (${lineCount(weakestStudentsSource)}).`);
});

check('skill analytics module stays pure and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'SkillProgressModel', 'QuestionAttemptModel', 'QuizResultModel', 'findOne', 'findOneAndUpdate',
    'MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
  ]) assert.ok(!analyticsSource.includes(forbidden), `skill analytics module must not include ${forbidden}`);
  assert.ok(lineCount(analyticsSource) <= 80, `skillAnalytics.ts exceeded 80 lines (${lineCount(analyticsSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-skill-analytics-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  rootRouteLines: lineCount(routeSource),
  analyticsRouteLines: lineCount(analyticsRouteSource),
  overviewLines: lineCount(overviewSource),
  weakestStudentsLines: lineCount(weakestStudentsSource),
  analyticsLines: lineCount(analyticsSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
