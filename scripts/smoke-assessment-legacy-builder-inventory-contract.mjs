import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const legacyBuilderPath = 'dashboards/admin/QuizBuilder.tsx';
const applicationEntryPoints = [
  'App.tsx',
  'dashboards/admin/QuizzesManager.tsx',
  'dashboards/admin/SubjectQuizzesPanel.tsx',
  'dashboards/admin/SupervisorTestsManager.tsx',
  'dashboards/admin/AdminDashboard.tsx',
  'dashboards/admin/builders/UnifiedLessonBuilder.tsx',
];
const unifiedBuilderEntryPoints = [
  'dashboards/admin/QuizzesManager.tsx',
  'dashboards/admin/SubjectQuizzesPanel.tsx',
  'dashboards/admin/SupervisorTestsManager.tsx',
  'dashboards/admin/builders/UnifiedLessonBuilder.tsx',
];
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('legacy builder remains present for compatibility', () => {
  assert.ok(fs.existsSync(path.join(root, legacyBuilderPath)));
  assert.match(read(legacyBuilderPath), /export const QuizBuilder/);
});

check('known application entry points do not import or lazy-load the legacy builder', () => {
  for (const entryPoint of applicationEntryPoints) {
    const source = read(entryPoint);
    assert.doesNotMatch(source, /(?:from\s+|import\s*\(\s*)['"][^'"]*\/QuizBuilder['"]/);
  }
});

check('live quiz entry points use the unified builder', () => {
  for (const entryPoint of unifiedBuilderEntryPoints) {
    assert.match(read(entryPoint), /from\s+['"][^'"]*UnifiedQuizBuilder['"]/);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-legacy-builder-inventory', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
