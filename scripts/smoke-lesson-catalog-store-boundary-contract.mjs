import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/lessonCatalogSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('lesson catalog slice owns CRUD behavior', () => {
  for (const fragment of [
    'export const createLessonCatalogSlice',
    'addLesson: (lesson)',
    'updateLesson: (lessonId, data)',
    'deleteLesson: (lessonId)',
    'api.createLesson',
    'api.updateLesson',
    'api.deleteLesson',
  ]) assert.ok(slice.includes(fragment), `lessonCatalogSlice lost ${fragment}`);
});

check('lesson creation preserves visibility default', () => {
  assert.ok(slice.includes("typeof lesson.showOnPlatform === 'boolean' ? lesson.showOnPlatform : false"));
});

check('lesson deletion keeps topic references consistent', () => {
  for (const fragment of [
    'topic.lessonIds?.includes(lessonId)',
    'topic.lessonIds.filter',
    'api.updateTopic(topic.id, { lessonIds: nextLessonIds })',
  ]) assert.ok(slice.includes(fragment), `lesson-delete topic cleanup lost ${fragment}`);
});

check('root store composes lesson catalog slice and no longer owns implementation', () => {
  assert.ok(store.includes("import { createLessonCatalogSlice } from './slices/lessonCatalogSlice';"));
  assert.ok(store.includes('...createLessonCatalogSlice<AppState>(set, api)'));
  for (const forbidden of ['addLesson: (lesson) =>', 'updateLesson: (lessonId, data) =>', 'deleteLesson: (lessonId) =>']) {
    assert.ok(!store.includes(forbidden), `useStore retained delegated lesson implementation: ${forbidden}`);
  }
});

check('public AppState lesson action contract remains unchanged', () => {
  for (const fragment of [
    'addLesson: (lesson: Lesson) => void;',
    'updateLesson: (lessonId: string, data: Partial<Lesson>) => void;',
    'deleteLesson: (lessonId: string) => void;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 120, `lessonCatalogSlice exceeded 120 lines (${lineCount})`);
  for (const forbidden of ["from 'react'", "from 'react-router-dom'", 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!slice.includes(forbidden), `lessonCatalogSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'lesson-catalog-store-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
