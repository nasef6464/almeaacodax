import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require('../node_modules/typescript/lib/typescript.js');
const source = fs.readFileSync(path.join(root, 'utils/quizProgressDraft.ts'), 'utf8');
const quizPageSource = fs.readFileSync(path.join(root, 'pages/QuizPage.tsx'), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const storage = new Map();
const fakeWindow = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
};
const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports, window: fakeWindow, console: { warn: () => undefined } }, { filename: 'quizProgressDraft.js' });
const { getQuizProgressStorageKey, readQuizProgressDraft, writeQuizProgressDraft, removeQuizProgressDraft } = module.exports;
const draft = {
  quizId: 'quiz-1',
  questionIds: ['question-1', 'question-2'],
  selectedOptions: { 'question-1': 2 },
  currentQuestionIndex: 1,
  timeLeft: 42,
  savedAt: '2026-08-30T00:00:00.000Z',
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

check('uses the established per-quiz storage key', () => {
  assert.equal(getQuizProgressStorageKey('quiz-1'), 'almeaa-quiz-progress:quiz-1');
});
check('round-trips the complete quiz progress draft', () => {
  assert.equal(writeQuizProgressDraft(draft), true);
  assert.equal(JSON.stringify(readQuizProgressDraft('quiz-1')), JSON.stringify(draft));
});
check('removes only the requested quiz draft', () => {
  writeQuizProgressDraft({ ...draft, quizId: 'quiz-2' });
  removeQuizProgressDraft('quiz-1');
  assert.equal(readQuizProgressDraft('quiz-1'), null);
  assert.equal(readQuizProgressDraft('quiz-2')?.quizId, 'quiz-2');
});
check('invalid persisted data is discarded safely', () => {
  storage.set(getQuizProgressStorageKey('broken'), '{not-json');
  assert.equal(readQuizProgressDraft('broken'), null);
  assert.equal(storage.has(getQuizProgressStorageKey('broken')), false);
});
check('runner delegates draft storage to the shared utility', () => {
  assert.ok(quizPageSource.includes("from '../utils/quizProgressDraft'"));
  assert.ok(quizPageSource.includes('readQuizProgressDraft(foundQuiz.id)'));
  assert.ok(quizPageSource.includes('writeQuizProgressDraft(draft)'));
  assert.ok(quizPageSource.includes('removeQuizProgressDraft(quiz.id)'));
  assert.equal(quizPageSource.includes("const QUIZ_PAGE_PROGRESS_PREFIX = 'almeaa-quiz-progress:'"), false);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'quiz-progress-draft', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
