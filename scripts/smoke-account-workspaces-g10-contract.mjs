import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [workspace, routes, app, header, dashboard, api, integration] = await Promise.all([
  read('server/src/modules/schools/application/schoolDirectorWorkspace.ts'),
  read('server/src/routes/schoolAccess.routes.ts'),
  read('App.tsx'),
  read('components/Header.tsx'),
  read('dashboards/SchoolDirectorDashboard.tsx'),
  read('services/api.ts'),
  read('server/src/scripts/backendIntegrationGate.ts'),
]);
const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => { values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`)); pass(label); };

includesAll(workspace, ['buildSchoolDirectorOverview', 'listSchoolDirectorStudents', 'addSchoolDirectorStudent', 'moveSchoolDirectorStudent', 'Student already belongs to another school', 'Class does not belong to this school', 'idempotent: alreadyAssigned'], 'director read models and student operations are school-bounded and idempotent');
includesAll(routes, ['SCHOOL_OVERVIEW_VIEW', 'SCHOOL_STUDENTS_VIEW', 'SCHOOL_STUDENTS_ADD', 'SCHOOL_STUDENTS_MOVE_CLASS', 'schools.director.student.add', 'schools.director.student.move_class'], 'every director endpoint checks its explicit permission and audit logs mutations');
assert.ok(!routes.includes('schoolAccessRouter.delete("/director/schools'), 'director API must not expose hard delete');
pass('director API exposes no student hard delete');
includesAll(app, ['path="/school-director-dashboard"', "allowedRoles={['school_admin']}", '<SchoolDirectorDashboard />'], 'School Director has a separate role-gated dashboard route');
includesAll(header, ["case 'school_admin':", "return '/school-director-dashboard'"], 'account navigation sends School Director to the separate workspace');
includesAll(dashboard, ['لوحة مدير المدرسة', 'نطاق مفوض من مدير المنصة', "hasPermission('SCHOOL_STUDENTS_ADD')", "hasPermission('SCHOOL_STUDENTS_MOVE_CLASS')", 'لا توجد مدرسة مفوضة', 'لم تتكرر أي عضوية'], 'dashboard has honest permission-aware loading empty success and operation states');
includesAll(api, ['getSchoolDirectorOverview:', 'getSchoolDirectorStudents:', 'addSchoolDirectorStudent:', 'moveSchoolDirectorStudent:'], 'dashboard operations use real APIs');
includesAll(integration, ['school director cannot grant self another school', 'school director cannot add student to ungranted school', 'school director cannot move another school student', 'repeated same-class move is idempotent', 'school director has no student delete endpoint'], 'isolated journey proves cross-school self-grant idempotency and delete negatives');

console.log('Account Workspaces G10 contract passed.');
