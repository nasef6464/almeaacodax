import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/quizCatalogSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('quiz catalog slice owns CRUD behavior', () => {
  for (const fragment of [
    'export const createQuizCatalogSlice',
    'addQuiz: async',
    'updateQuiz: async',
    'deleteQuiz: (quizId)',
    'api.createQuiz',
    'api.updateQuiz',
    'api.deleteQuiz',
  ]) assert.ok(slice.includes(fragment), `quizCatalogSlice lost ${fragment}`);
});

check('quiz placement normalization remains preserved', () => {
  for (const fragment of [
    'showOnPlatform',
    "'type' in data",
    "'placement' in data",
    "'showInTraining' in data",
    "'showInMock' in data",
    "'quizKind' in data",
    "'mockExam' in data",
    "'learningPlacements' in data",
    'normalizeQuizPlacement',
  ]) assert.ok(slice.includes(fragment), `quiz placement behavior lost ${fragment}`);
});

check('quiz deletion keeps topic references consistent', () => {
  for (const fragment of [
    'topic.quizIds?.includes(quizId)',
    'topic.quizIds.filter',
    'api.updateTopic(topic.id, { quizIds: nextQuizIds })',
  ]) assert.ok(slice.includes(fragment), `quiz-delete topic cleanup lost ${fragment}`);
});

check('root store composes quiz catalog slice and no longer owns implementation', () => {
  assert.ok(store.includes("import { createQuizCatalogSlice } from './slices/quizCatalogSlice';"));
  assert.ok(store.includes('...createQuizCatalogSlice<AppState>(set, get, api, { normalizeQuizPlacement })'));
  for (const forbidden of ['addQuiz: async (quiz)', 'updateQuiz: async (quizId, data)', 'deleteQuiz: (quizId)']) {
    assert.ok(!store.includes(forbidden), `useStore retained delegated quiz implementation: ${forbidden}`);
  }
});

check('public AppState quiz action contract remains unchanged', () => {
  for (const fragment of [
    'addQuiz: (quiz: Quiz) => Promise<Quiz>;',
    'updateQuiz: (quizId: string, data: Partial<Quiz>) => Promise<Quiz>;',
    'deleteQuiz: (quizId: string) => void;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 150, `quizCatalogSlice exceeded 150 lines (${lineCount})`);
  for (const forbidden of ["from 'react'", "from 'react-router-dom'", 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!slice.includes(forbidden), `quizCatalogSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'quiz-catalog-store-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
