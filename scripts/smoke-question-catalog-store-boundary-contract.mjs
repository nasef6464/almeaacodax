import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const storePath = path.join(root, 'store/useStore.ts');
const slicePath = path.join(root, 'store/slices/questionCatalogSlice.ts');

const store = fs.readFileSync(storePath, 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(slicePath, 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

check('question catalog slice owns CRUD behavior', () => {
  for (const fragment of [
    'export const createQuestionCatalogSlice',
    'addQuestion: async',
    'updateQuestion: async',
    'deleteQuestion: async',
    'api.createQuestion',
    'api.updateQuestion',
    'api.deleteQuestion',
  ]) {
    assert.ok(slice.includes(fragment), `questionCatalogSlice lost ${fragment}`);
  }
});

check('question deletion keeps local quiz references consistent', () => {
  for (const fragment of [
    'quiz.questionIds?.includes(questionId)',
    'quiz.mockExam?.sections?.some',
    'questionIds: quiz.questionIds?.filter',
    'section.questionIds?.filter',
  ]) {
    assert.ok(slice.includes(fragment), `question-delete cascade lost ${fragment}`);
  }
});

check('root store composes question catalog slice', () => {
  assert.ok(
    store.includes("import { createQuestionCatalogSlice } from './slices/questionCatalogSlice';"),
    'useStore must import questionCatalogSlice',
  );
  assert.ok(
    store.includes('...createQuestionCatalogSlice<AppState>(set, api)'),
    'useStore must compose questionCatalogSlice',
  );
});

check('root store no longer owns question CRUD implementation', () => {
  for (const forbidden of [
    'addQuestion: async (question)',
    'updateQuestion: async (questionId, data)',
    'deleteQuestion: async (questionId)',
  ]) {
    assert.ok(!store.includes(forbidden), `useStore retained delegated implementation: ${forbidden}`);
  }
});

check('public AppState question action contract remains unchanged', () => {
  for (const fragment of [
    'addQuestion: (question: Question) => Promise<Question>;',
    'updateQuestion: (questionId: string, data: Partial<Question>) => Promise<Question>;',
    'deleteQuestion: (questionId: string) => Promise<void>;',
  ]) {
    assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
  }
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 140, `questionCatalogSlice exceeded 140 lines (${lineCount})`);
  for (const forbidden of [
    "from 'react'",
    "from 'react-router-dom'",
    'window.',
    'document.',
    'localStorage',
    'sessionStorage',
  ]) {
    assert.ok(!slice.includes(forbidden), `questionCatalogSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'question-catalog-store-boundary',
  status: failed.length ? 'FAIL' : 'PASS',
  checks,
}, null, 2));

if (failed.length) process.exit(1);
