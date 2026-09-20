import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const store = read('store/useStore.ts');
const slice = read('store/slices/studentGroupMembershipSlice.ts');
const transitions = read('store/slices/studentGroupMembershipTransitions.ts');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('student membership slice owns orchestration and persistence', () => {
  for (const fragment of [
    'export const createStudentGroupMembershipSlice',
    'assignStudentToGroup:',
    'assignStudentToGroupAsync:',
    'removeStudentFromGroup:',
    'removeStudentFromGroupAsync:',
    'api.updateAdminUser',
    'api.updateGroup',
    'assignStudentMembership',
    'removeStudentMembership',
  ]) assert.ok(slice.includes(fragment), `student membership slice lost ${fragment}`);
});

check('pure transition module preserves single-school and single-class semantics', () => {
  for (const fragment of [
    'export const assignStudentMembership',
    'export const removeStudentMembership',
    'const getSchoolClassIds = (schoolId?: string) =>',
    "targetGroup.type === 'CLASS' && targetGroup.parentId",
    '.filter((classId) => classId !== targetGroup.id)',
    'addStudentToGroup(targetGroup.parentId)',
    '(id) => id !== targetGroup.id && !relatedClassIds.includes(id)',
  ]) assert.ok(transitions.includes(fragment), `student membership scope rule lost ${fragment}`);
});

check('root store composes student membership slice and no longer owns implementation', () => {
  assert.ok(store.includes("import { createStudentGroupMembershipSlice } from './slices/studentGroupMembershipSlice';"));
  assert.ok(store.includes('...createStudentGroupMembershipSlice<AppState>(set, get, api)'));
  for (const forbidden of [
    'assignStudentToGroup: (userId, groupId) =>',
    'assignStudentToGroupAsync: async (userId, groupId)',
    'removeStudentFromGroup: (userId, groupId) =>',
    'removeStudentFromGroupAsync: async (userId, groupId)',
  ]) assert.ok(!store.includes(forbidden), `useStore retained delegated student membership action: ${forbidden}`);
});

check('public AppState student membership contract remains unchanged', () => {
  for (const fragment of [
    'assignStudentToGroup: (userId: string, groupId: string) => void;',
    'assignStudentToGroupAsync: (userId: string, groupId: string) => Promise<void>;',
    'removeStudentFromGroup: (userId: string, groupId: string) => void;',
    'removeStudentFromGroupAsync: (userId: string, groupId: string) => Promise<void>;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('transition boundary remains bounded and side-effect free', () => {
  assert.ok(transitions.split(/\r?\n/).length <= 190, 'student membership transitions exceeded 190 lines');
  for (const forbidden of ['api.', 'fetch(', 'axios', 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!transitions.includes(forbidden), `transition module must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'student-group-membership-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
