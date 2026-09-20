import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/courseCatalogSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('course catalog slice owns CRUD behavior', () => {
  for (const fragment of [
    'export const createCourseCatalogSlice',
    'addCourse: async',
    'updateCourse: async',
    'deleteCourse: async',
    'api.createCourse',
    'api.updateCourse',
    'api.deleteCourse',
  ]) assert.ok(slice.includes(fragment), `courseCatalogSlice lost ${fragment}`);
});

check('course normalization and canonical id handling remain preserved', () => {
  for (const fragment of [
    'normalizeCourseForStore(course)',
    'resolveEntityId(created, normalizedCourse.id)',
    'resolveEntityId(updated, courseId)',
    'resolveEntityId(item) !== persistedCourse.id',
    'resolveEntityId(course) !== String(courseId)',
  ]) assert.ok(slice.includes(fragment), `course normalization behavior lost ${fragment}`);
});

check('root store composes course catalog slice and no longer owns implementation', () => {
  assert.ok(store.includes("import { createCourseCatalogSlice } from './slices/courseCatalogSlice';"));
  assert.ok(store.includes('...createCourseCatalogSlice<AppState>(set, api, { normalizeCourseForStore, resolveEntityId })'));
  for (const forbidden of ['addCourse: async (course)', 'updateCourse: async (courseId, data)', 'deleteCourse: async (courseId)']) {
    assert.ok(!store.includes(forbidden), `useStore retained delegated course implementation: ${forbidden}`);
  }
});

check('public AppState course action contract remains unchanged', () => {
  for (const fragment of [
    'addCourse: (course: Course) => Promise<Course | null>;',
    'updateCourse: (courseId: string, data: Partial<Course>) => Promise<Course | null>;',
    'deleteCourse: (courseId: string) => Promise<void>;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 140, `courseCatalogSlice exceeded 140 lines (${lineCount})`);
  for (const forbidden of ["from 'react'", "from 'react-router-dom'", 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!slice.includes(forbidden), `courseCatalogSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'course-catalog-store-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
