import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/topicCatalogSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('topic catalog slice owns CRUD behavior', () => {
  for (const fragment of [
    'export const createTopicCatalogSlice',
    'addTopic: (topic)',
    'updateTopic: (topicId, data)',
    'deleteTopic: (topicId)',
    'api.createTopic',
    'api.updateTopic',
    'api.deleteTopic',
  ]) assert.ok(slice.includes(fragment), `topicCatalogSlice lost ${fragment}`);
});

check('topic creation preserves visibility default', () => {
  assert.ok(slice.includes("typeof topic.showOnPlatform === 'boolean' ? topic.showOnPlatform : false"));
});

check('root store composes topic catalog slice and no longer owns implementation', () => {
  assert.ok(store.includes("import { createTopicCatalogSlice } from './slices/topicCatalogSlice';"));
  assert.ok(store.includes('...createTopicCatalogSlice<AppState>(set, api)'));
  for (const forbidden of ['addTopic: (topic) =>', 'updateTopic: (topicId, data) =>', 'deleteTopic: (topicId) =>']) {
    assert.ok(!store.includes(forbidden), `useStore retained delegated topic implementation: ${forbidden}`);
  }
});

check('public AppState topic action contract remains unchanged', () => {
  for (const fragment of [
    "addTopic: (topic: import('../types').Topic) => void;",
    "updateTopic: (topicId: string, data: Partial<import('../types').Topic>) => void;",
    'deleteTopic: (topicId: string) => void;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 100, `topicCatalogSlice exceeded 100 lines (${lineCount})`);
  for (const forbidden of ["from 'react'", "from 'react-router-dom'", 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!slice.includes(forbidden), `topicCatalogSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'topic-catalog-store-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
