import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const transpileCommonJs = (path) => {
  const source = fs.readFileSync(path, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: path.pathname,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics || [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  if (errors.length) throw new Error(`${path.pathname} transpile failed:\n${errors.join('\n')}`);
  return transpiled.outputText;
};

const defaults = {
  showExplanations: true,
  showAnswers: true,
  showResultsReport: true,
  returnToSourceOnFinish: false,
  maxAttempts: 3,
  passingScore: 60,
  timeLimit: 60,
  randomizeQuestions: true,
  randomizeOptions: false,
  showProgressBar: true,
  requireAnswerBeforeNext: false,
  allowQuestionReview: true,
  optionLayout: 'auto',
};

// Frontend compatibility resolver
const settingsModule = { exports: {} };
vm.runInNewContext(
  transpileCommonJs(new URL('../utils/assessmentSettings.ts', import.meta.url)),
  {
    module: settingsModule,
    exports: settingsModule.exports,
    require: (id) => { throw new Error(`Unexpected assessmentSettings runtime dependency: ${id}`); },
  },
  { filename: 'assessmentSettings.js' },
);

const { resolveAssessmentSettings, toCanonicalAssessmentSettingsPayload } = settingsModule.exports;
if (typeof resolveAssessmentSettings !== 'function' || typeof toCanonicalAssessmentSettingsPayload !== 'function') {
  throw new Error('Assessment settings resolver exports are missing');
}

const legacy = resolveAssessmentSettings({
  showCorrectAnswers: false,
  shuffleQuestions: false,
  shuffleOptions: true,
}, defaults);

if (legacy.showAnswers !== false) throw new Error('showCorrectAnswers legacy alias was not mapped');
if (legacy.randomizeQuestions !== false) throw new Error('shuffleQuestions legacy alias was not mapped');
if (legacy.randomizeOptions !== true) throw new Error('shuffleOptions legacy alias was not mapped');

const canonicalWins = resolveAssessmentSettings({
  showAnswers: true,
  showCorrectAnswers: false,
  randomizeQuestions: true,
  shuffleQuestions: false,
  randomizeOptions: false,
  shuffleOptions: true,
}, defaults);

if (canonicalWins.showAnswers !== true) throw new Error('Canonical showAnswers must win over legacy alias');
if (canonicalWins.randomizeQuestions !== true) throw new Error('Canonical randomizeQuestions must win over legacy alias');
if (canonicalWins.randomizeOptions !== false) throw new Error('Canonical randomizeOptions must win over legacy alias');

const canonicalPayload = toCanonicalAssessmentSettingsPayload({ shuffleOptions: true }, defaults);
if ('shuffleOptions' in canonicalPayload || 'shuffleQuestions' in canonicalPayload || 'showCorrectAnswers' in canonicalPayload) {
  throw new Error('Canonical write payload must not emit legacy aliases');
}
if (canonicalPayload.randomizeOptions !== true) {
  throw new Error('Canonical payload must carry mapped randomizeOptions');
}

// Mongo persistence compatibility during the transition.
const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
const mongoose = serverRequire('mongoose');
const modelModule = { exports: {} };
vm.runInNewContext(
  transpileCommonJs(new URL('../server/src/models/Quiz.ts', import.meta.url)),
  {
    module: modelModule,
    exports: modelModule.exports,
    require: (id) => {
      if (id === 'mongoose') return mongoose;
      throw new Error(`Unexpected Quiz model runtime dependency: ${id}`);
    },
  },
  { filename: 'Quiz.js' },
);

const { QuizModel } = modelModule.exports;
if (!QuizModel) throw new Error('QuizModel export is unavailable');

const legacyDoc = new QuizModel({
  _id: 'assessment-settings-legacy',
  id: 'assessment-settings-legacy',
  title: 'Legacy settings proof',
  pathId: 'path-1',
  subjectId: 'subject-1',
  settings: { shuffleOptions: true },
});
const legacyObject = legacyDoc.toObject();
if (legacyObject.settings?.shuffleOptions !== true) {
  throw new Error('Mongo Quiz model dropped legacy shuffleOptions before migration');
}

const canonicalDoc = new QuizModel({
  _id: 'assessment-settings-canonical',
  id: 'assessment-settings-canonical',
  title: 'Canonical settings proof',
  pathId: 'path-1',
  subjectId: 'subject-1',
  settings: { randomizeOptions: true },
});
const canonicalObject = canonicalDoc.toObject();
if (canonicalObject.settings?.randomizeOptions !== true) {
  throw new Error('Mongo Quiz model dropped canonical randomizeOptions');
}

console.log('Assessment settings compatibility contract PASS (10/10)');
