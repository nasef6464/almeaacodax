import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/groupCrudSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('group CRUD slice owns synchronous and async CRUD behavior', () => {
  for (const fragment of [
    'export const createGroupCrudSlice',
    'createGroup: (group)',
    'createGroupAsync: async (group)',
    'updateGroup: (groupId, data)',
    'updateGroupAsync: async (groupId, data)',
    'deleteGroup: (groupId)',
    'deleteGroupAsync: async (groupId)',
    'api.createGroup',
    'api.updateGroup',
    'api.deleteGroup',
  ]) assert.ok(slice.includes(fragment), `groupCrudSlice lost ${fragment}`);
});

check('school deletion still cleans child classes packages access codes and user scope', () => {
  for (const fragment of [
    "targetGroup?.type === 'SCHOOL'",
    'state.groups.filter((group) => group.parentId === groupId)',
    'state.b2bPackages.filter((pkg) => pkg.schoolId !== groupId)',
    'code.schoolId !== groupId && !deletedPackageIds.has(code.packageId)',
    'groupIds: user.groupIds?.filter((id) => !deletedGroupIds.has(id)) || []',
    'users.find((user) => user.id === state.user.id) || state.user',
  ]) assert.ok(slice.includes(fragment), `group deletion cleanup lost ${fragment}`);
});

check('root store composes group CRUD slice and keeps membership actions separate', () => {
  assert.ok(store.includes("import { createGroupCrudSlice } from './slices/groupCrudSlice';"));
  assert.ok(store.includes('...createGroupCrudSlice<AppState>(set, api)'));
  assert.ok(store.includes('assignStudentToGroup:'));
  assert.ok(store.includes('assignSupervisorToGroup:'));
  assert.ok(store.includes('assignTeacherToGroupAsync:'));
  for (const forbidden of [
    'createGroup: (group) => set',
    'createGroupAsync: async (group)',
    'updateGroupAsync: async (groupId, data)',
    'deleteGroupAsync: async (groupId)',
  ]) assert.ok(!store.includes(forbidden), `useStore retained delegated group CRUD implementation: ${forbidden}`);
});

check('public AppState group CRUD contract remains unchanged', () => {
  for (const fragment of [
    'createGroup: (group: Group) => void;',
    'createGroupAsync: (group: Group) => Promise<Group>;',
    'updateGroup: (groupId: string, data: Partial<Group>) => void;',
    'updateGroupAsync: (groupId: string, data: Partial<Group>) => Promise<Group>;',
    'deleteGroup: (groupId: string) => void;',
    'deleteGroupAsync: (groupId: string) => Promise<void>;',
  ]) assert.ok(store.includes(fragment), `AppState contract changed: ${fragment}`);
});

check('slice remains bounded and UI-free', () => {
  const lineCount = slice.split(/\r?\n/).length;
  assert.ok(lineCount <= 180, `groupCrudSlice exceeded 180 lines (${lineCount})`);
  for (const forbidden of ["from 'react'", "from 'react-router-dom'", 'window.', 'document.', 'localStorage', 'sessionStorage']) {
    assert.ok(!slice.includes(forbidden), `groupCrudSlice must not include ${forbidden}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'group-crud-store-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
