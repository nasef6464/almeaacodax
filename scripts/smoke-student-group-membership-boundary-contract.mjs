import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const store = fs.readFileSync(path.join(root, 'store/useStore.ts'), 'utf8').replace(/\r\n/g, '\n');
const slice = fs.readFileSync(path.join(root, 'store/slices/studentGroupMembershipSlice.ts'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('student membership slice owns sync and async assign/remove actions', () => {
  for (const fragment of [
    'export const createStudentGroupMembershipSlice',
    'assignStudentToGroup:',
    'assignStudentToGroupAsync:',
    'removeStudentFromGroup:',
    'removeStudentFromGroupAsync:',
    'api.updateAdminUser',
    'api.updateGroup',
  ]) assert.ok(slice.includes(fragment), `student membership slice lost ${fragment}`);
});

check('single-school and single-class semantics remain preserved', () => {
  for (const fragment of [
    'const getSchoolClassIds = (schoolId?: string) =>',
    "targetGroup.type === 'CLASS' && targetGroup.parentId",
    '.filter(classId => classId !== targetGroup.id)',
    'addUserToGroup(targetGroup.parentId, true)',
    'nextGroupIds = nextGroupIds.filter(id => id !== groupId && !relatedClassIds.includes(id))',
  ]) assert.ok(slice.includes(fragment), `student membership scope rule lost ${fragment}`);
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

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'student-group-membership-boundary', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
