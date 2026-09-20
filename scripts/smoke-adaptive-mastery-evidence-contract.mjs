import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

const sideEffects = read('server/src/modules/quizzes/application/quizSubmissionSideEffects.ts');
const analytics = read('server/src/modules/quizzes/analytics/skillAnalytics.ts');
const skillsAnalysis = read('server/src/modules/quizzes/application/quizSubmissionSkillsAnalysis.ts');
const model = read('server/src/models/SkillProgress.ts');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('skill analysis preserves evidence volume', () => {
  assert.ok(skillsAnalysis.includes('questionCount: stats.total'));
  assert.ok(skillsAnalysis.includes('correctCount: stats.correct'));
});

check('skill progress persists evidence count', () => {
  assert.ok(model.includes('evidenceCount: { type: Number, default: 0 }'));
});

check('mastery merge is weighted by evidence rather than quiz count only', () => {
  for (const fragment of [
    'export const mergeSkillMasteryEvidence',
    'previousMastery * safePreviousEvidence',
    'safeCurrentMastery * safeCurrentEvidence',
    'return { mastery, evidenceCount }',
  ]) {
    assert.ok(analytics.includes(fragment), `skillAnalytics lost ${fragment}`);
  }
});

check('quiz and single-question progress use the shared evidence merge', () => {
  const mergeCalls = sideEffects.match(/mergeSkillMasteryEvidence\(/g) || [];
  assert.equal(mergeCalls.length, 2, `expected 2 mastery merge calls, found ${mergeCalls.length}`);
  assert.ok(sideEffects.includes('currentEvidence = Math.max(1, Number(skill.questionCount || skill.total || 1))'));
  assert.ok(sideEffects.includes('currentEvidence: 1'));
  assert.ok(sideEffects.includes('evidenceCount: mergedMastery.evidenceCount'));
});

check('legacy progress remains backward compatible', () => {
  assert.ok(sideEffects.includes('existing?.evidenceCount || existing?.attempts || 0'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'adaptive-mastery-evidence',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
