import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routeSource = fs.readFileSync(path.join(root, 'server/src/routes/quiz.routes.ts'), 'utf8').replace(/\r\n/g, '\n');
const analyticsSource = fs.readFileSync(path.join(root, 'server/src/modules/quizzes/analytics/skillAnalytics.ts'), 'utf8').replace(/\r\n/g, '\n');
const lineCount = (source) => source.split(/\r?\n/).length;
const analyticsImport = 'import { buildRecommendedAction, buildResultSkillStatus, buildSkillRecommendation, buildSkillStatus } from "../modules/quizzes/analytics/skillAnalytics.js";';
const delegated = routeSource.includes(analyticsImport);
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

check('analytics helper call sites remain route-owned', () => {
  for (const fragment of [
    'const nextStatus = buildSkillStatus(nextMastery);',
    'recommendedAction: buildRecommendedAction(nextMastery, nextAttempts)',
    'recommendedAction: buildRecommendedAction(mastery, item.attempts)',
    'const status = buildResultSkillStatus(mastery);',
    'recommendation: buildSkillRecommendation(mastery)',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost analytics helper call site ${fragment}`);
});

check('analytics evidence policy remains route-owned', () => {
  for (const fragment of [
    'const MIN_ANALYTICS_SKILL_EVIDENCE_COUNT = 3;',
    '.filter((item) => item.attempts >= MIN_ANALYTICS_SKILL_EVIDENCE_COUNT)',
    'minSkillEvidence: MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost evidence policy ${fragment}`);
});

check('analytics helper ownership is exclusive after delegation while staging remains baseline-compatible', () => {
  for (const declaration of [
    'const buildRecommendedAction = (mastery: number, attemptCount: number) => {',
    'const buildSkillStatus = (mastery: number) => {',
    'const buildResultSkillStatus = (mastery: number) => {',
    'const buildSkillRecommendation = (mastery: number) => {',
  ]) {
    assert.equal(routeSource.includes(declaration), !delegated, `${delegated ? 'delegated' : 'route-owned'} analytics ownership mismatch for ${declaration}`);
  }
});

check('delegated analytics import is singular and before route-local state', () => {
  if (!delegated) return;
  assert.equal(routeSource.split(analyticsImport).length - 1, 1, 'analytics helper import must be singular');
  const importIndex = routeSource.indexOf(analyticsImport);
  const stateIndex = routeSource.indexOf('const PUBLIC_QUIZ_LIST_CACHE_TTL_MS = 30 * 1000;');
  assert.ok(importIndex >= 0 && stateIndex >= 0 && importIndex < stateIndex, 'analytics helper import must precede route-local state');
});

check('analytics database orchestration remains route-owned', () => {
  for (const fragment of [
    'SkillProgressModel.findOne({ userId, skillId })',
    'SkillProgressModel.findOneAndUpdate(',
    'QuestionAttemptModel.find(',
    'QuizResultModel.find(',
    'const weakestSkills = Array.from(weakSkillMap.values())',
  ]) assert.ok(routeSource.includes(fragment), `quiz route lost analytics orchestration ${fragment}`);
});

check('skill analytics module stays pure and bounded', () => {
  for (const forbidden of [
    'express', 'mongoose', '../models/', 'Router(', 'req.', 'res.', 'process.env', 'Date.now',
    'StatusCodes', 'SkillProgressModel', 'QuestionAttemptModel', 'QuizResultModel', 'findOne', 'findOneAndUpdate',
    'MIN_ANALYTICS_SKILL_EVIDENCE_COUNT',
  ]) assert.ok(!analyticsSource.includes(forbidden), `skill analytics module must not include ${forbidden}`);
  assert.ok(lineCount(analyticsSource) <= 50, `skillAnalytics.ts exceeded 50 lines (${lineCount(analyticsSource)}).`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'quiz-skill-analytics-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  delegated,
  routeLines: lineCount(routeSource),
  analyticsLines: lineCount(analyticsSource),
  checks,
}, null, 2));
if (failed.length) process.exit(1);
