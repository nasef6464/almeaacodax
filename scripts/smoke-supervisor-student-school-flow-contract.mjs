import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const authRoutes = read('server/src/routes/auth.routes.ts');
const relationshipService = read('server/src/services/adminUserRelationshipService.ts');
const store = read('store/useStore.ts');
const usersManager = read('dashboards/admin/UsersManager.tsx');
const quizBuilder = read('dashboards/admin/UnifiedQuizBuilder.tsx');
const notificationBell = read('components/NotificationBell.tsx');
const notificationStream = read('contexts/useNotificationStream.ts');

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

check('admin user writes delegate school relationship normalization and reconciliation', () => {
  assert.ok(authRoutes.includes('normalizeAdminUserRelationshipPayload'));
  assert.ok(authRoutes.includes('reconcileAdminUserGroupMembership'));
  assert.ok(authRoutes.includes('relationship.payload'));
});

check('relationship service keeps class-only supervisor scope from becoming school-wide', () => {
  assert.ok(relationshipService.includes('explicitSchoolIds'));
  assert.ok(relationshipService.includes('payload.schoolId = normalizedSchoolId || null'));
  assert.ok(relationshipService.includes('GroupModel.updateMany({ supervisorIds: userId }'));
  assert.ok(relationshipService.includes('GroupModel.updateMany({ studentIds: userId }'));
});

check('users manager persists one desired relationship state instead of racing add/remove writes', () => {
  assert.ok(store.includes('updateUserAsync:'));
  assert.ok(usersManager.includes('updateUserAsync'));
  assert.ok(usersManager.includes('persistRelationshipScope'));
  assert.ok(!usersManager.includes('assignSupervisorToGroup,'));
  assert.ok(!usersManager.includes('removeSupervisorFromGroup,'));
  assert.ok(!usersManager.includes('assignStudentToGroup,'));
  assert.ok(!usersManager.includes('removeStudentFromGroup,'));
});

check('supervisor-created directed assessments default to published and visible', () => {
  assert.ok(quizBuilder.includes('editingQuiz?.isPublished ?? (isAdmin || isSupervisor)'));
  assert.ok(quizBuilder.includes('editingQuiz?.showOnPlatform ?? (isAdmin || isSupervisor)'));
});

check('notification bell supports cookie-first sessions without a bearer token', () => {
  assert.ok(notificationBell.includes('enabled={true}'));
  assert.ok(!notificationBell.includes('if (!token) return;'));
  assert.ok(notificationStream.includes('const url = token'));
  assert.ok(notificationStream.includes('withCredentials: !token'));
  assert.ok(!notificationStream.includes('if (!enabled || !token || !isMounted.current) return;'));
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'supervisor-student-school-flow', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
