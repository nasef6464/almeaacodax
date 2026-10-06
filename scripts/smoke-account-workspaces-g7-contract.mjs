import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [policy, courses, quizzes, content, app, dashboard, users, switcher] = await Promise.all([
  read('server/src/services/managedContentScope.ts'),
  read('server/src/routes/course.routes.ts'),
  read('server/src/routes/quiz.routes.ts'),
  read('server/src/routes/content.routes.ts'),
  read('App.tsx'),
  read('dashboards/admin/AdminDashboard.tsx'),
  read('dashboards/admin/UsersManager.tsx'),
  read('components/RoleSwitcher.tsx'),
]);

const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => {
  values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`));
  pass(label);
};

includesAll(policy, [
  'storedUser.managedPathIds',
  'storedUser.managedSubjectIds',
  'return false;',
  '{ _id: { $exists: false } }',
  'Content is outside the platform trainer managed scope',
], 'managed content policy resolves fresh assignments and fails closed');

includesAll(courses, [
  'buildManagedContentScopeFilter(managedScope)',
  'await assertManagedContentScope(req.authUser!, normalizedPayload)',
  'await assertManagedContentScope(req.authUser!, existing.toObject())',
], 'course list/create/update/delete use the server managed scope');

includesAll(quizzes, [
  'combineMongoFilters(baseFilter, scopeFilter, buildManagedContentScopeFilter(managedScope))',
  'await assertManagedContentScope(req.authUser!, payload)',
  'await assertManagedContentScope(req.authUser!, mergedPayload)',
], 'question and quiz lists and writes use the server managed scope');

includesAll(content, [
  'TopicModel.find(combineMongoFilters(finalTopicFilter, managedFilter))',
  'LessonModel.find(combineMongoFilters(finalLessonFilter, managedFilter))',
  'LibraryItemModel.find(combineMongoFilters(finalLibraryFilter, managedFilter))',
  'await assertManagedContentScope(req.authUser!, payload)',
], 'topic lesson and library reads and writes use the same scope');

includesAll(app, [
  "const adminDashboard = (",
  "<RequireRole allowedRoles={['admin']}>",
  "const instructorDashboard = (",
  "<RequireRole allowedRoles={['teacher']}>",
  '<Route path="/admin-dashboard" element={adminDashboard} />',
  '<Route path="/instructor-dashboard" element={instructorDashboard} />',
  'لوحة مدرب المنصة',
], 'admin and platform trainer routes are separate and role-bound');

includesAll(dashboard, [
  'لوحة مدرب المنصة',
  'إدارة المحتوى داخل المسارات والمواد المسندة',
  'مدربو المنصة النشطون',
], 'platform trainer dashboard has an explicit product identity');

includesAll(users, [
  "return 'مدرب منصة';",
  "return 'معلم مدرسة';",
  "return 'مدرب منصة + معلم مدرسة';",
  'مدرب منصة / معلم مدرسة',
], 'admin user management labels trainer school-teacher and hybrid accounts explicitly');

assert.ok(switcher.includes("label: 'مدرب منصة'"), 'development role switcher must name the platform trainer');
pass('development role switcher uses platform trainer label');

console.log('Account Workspaces G7 contract passed.');
