import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../components/LearningSection.tsx', import.meta.url), 'utf8');
const checks = [];

const check = (name, run) => {
  try {
    run();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, message: error.message });
  }
};

check('learning bootstrap is scoped to the active path and subject', () => {
  assert.ok(source.includes("const scopeKey = `${category}:${subject}`;"));
  assert.ok(source.includes('api.getCourses({ pathId: category, subjectId: subject, limit: 100 })'));
  assert.ok(source.includes('api.getQuizzes({ pathId: category, subjectId: subject, limit: 100 })'));
});

check('late scoped responses cannot replace the current shared collections', () => {
  assert.ok(source.includes('if (scopedLearningBootstrapRef.current !== scopeKey) return;'));
  assert.ok(source.indexOf('if (scopedLearningBootstrapRef.current !== scopeKey) return;') < source.indexOf('hydrateCourses(Array.from(mergedCourses.values()))'));
  assert.ok(source.indexOf('if (scopedLearningBootstrapRef.current !== scopeKey) return;') < source.indexOf('hydrateQuizzes(Array.from(mergedQuizzes.values()))'));
});

check('scoped loading failure is visible and retryable without a global reload', () => {
  assert.ok(source.includes("useState<'idle' | 'loading' | 'ready' | 'error'>('idle')"));
  assert.ok(source.includes("setScopedBootstrapState(coursesResult.status === 'rejected' && quizzesResult.status === 'rejected' ? 'error' : 'ready')"));
  assert.ok(source.includes('retryScopedLearningBootstrap'));
  assert.ok(source.includes('تعذر تحديث الدورات والاختبارات لهذه المادة الآن'));
});

const failures = checks.filter((checkResult) => !checkResult.passed);
for (const result of checks) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.message ? `: ${result.message}` : ''}`);
}

if (failures.length) process.exitCode = 1;
