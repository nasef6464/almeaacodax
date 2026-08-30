import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript/lib/typescript.js');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const settingsSource = read('utils/assessmentSettings.ts');
const builderSource = read('dashboards/admin/UnifiedQuizBuilder.tsx');
const runnerSource = read('pages/QuizPage.tsx');
const transpiled = ts.transpileModule(settingsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const settingsModule = { exports: {} };
vm.runInNewContext(transpiled, { module: settingsModule, exports: settingsModule.exports }, { filename: 'assessmentSettings.js' });
const { resolveAssessmentSettings, toCanonicalAssessmentSettingsPayload } = settingsModule.exports;

const defaults = {
  showExplanations: true,
  showAnswers: true,
  maxAttempts: 3,
  passingScore: 60,
  timeLimit: 60,
  randomizeQuestions: true,
  randomizeOptions: false,
  optionLayout: 'auto',
};
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};

check('legacy aliases resolve to canonical settings', () => {
  const resolved = resolveAssessmentSettings({ showCorrectAnswers: false, shuffleQuestions: false, shuffleOptions: true }, defaults);
  assert.equal(resolved.showAnswers, false);
  assert.equal(resolved.randomizeQuestions, false);
  assert.equal(resolved.randomizeOptions, true);
});

check('canonical values win over legacy aliases', () => {
  const resolved = resolveAssessmentSettings({ showAnswers: true, showCorrectAnswers: false, randomizeOptions: false, shuffleOptions: true }, defaults);
  assert.equal(resolved.showAnswers, true);
  assert.equal(resolved.randomizeOptions, false);
});

check('new builder payload drops legacy aliases', () => {
  const payload = toCanonicalAssessmentSettingsPayload({ shuffleOptions: true, shuffleQuestions: false, showCorrectAnswers: false }, defaults);
  assert.equal(payload.randomizeOptions, true);
  assert.equal(payload.randomizeQuestions, false);
  assert.equal(payload.showAnswers, false);
  assert.equal('shuffleOptions' in payload, false);
  assert.equal('shuffleQuestions' in payload, false);
  assert.equal('showCorrectAnswers' in payload, false);
});

check('unified builder consumes the shared resolver and canonical writer', () => {
  assert.ok(builderSource.includes('resolveAssessmentSettings(editingQuiz?.settings, defaults)'));
  assert.ok(builderSource.includes('settings: toCanonicalAssessmentSettingsPayload({'));
  assert.ok(!builderSource.includes('          shuffleOptions,'));
});

check('student runner consumes resolved settings for result and ordering behavior', () => {
  assert.ok(runnerSource.includes('const quizSettings = useMemo(() => resolveQuizSettings(quiz), [quiz]);'));
  assert.ok(runnerSource.includes('const shouldRandomize = quizSettings.randomizeOptions === true;'));
  assert.ok(runnerSource.includes('{quizSettings.showAnswers && ('));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'assessment-settings-consumption', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
