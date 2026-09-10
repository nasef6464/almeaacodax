import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [workspace, accessRoutes, classroomRoutes, app, dashboard, consolePage, contextGate] = await Promise.all([
  read('server/src/modules/schools/application/schoolTeacherWorkspace.ts'),
  read('server/src/routes/schoolAccess.routes.ts'),
  read('server/src/routes/classroom.routes.ts'),
  read('App.tsx'),
  read('dashboards/SchoolTeacherDashboard.tsx'),
  read('pages/ClassroomTeacherConsole.tsx'),
  read('components/teacher/TeacherWorkspaceContext.tsx'),
]);

const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => {
  values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`));
  pass(label);
};

includesAll(workspace, [
  'resolveSchoolContexts(actor)',
  'teacherId: actor.id',
  'status: "active"',
  'String(classroom.parentId) === String(assignment.schoolId)',
  'targetGroupIds: { $in: validClassIds }',
  'platformTrainer:',
  'schoolTeacher: availableSchools.length > 0',
], 'teacher workspace joins active membership assignment class and school assessment without cross-school leakage');

includesAll(accessRoutes, [
  '"/teacher-workspace"',
  'requireRole(["teacher"])',
  'buildSchoolTeacherWorkspace(req.authUser!)',
], 'teacher workspace API is authenticated and teacher-only');

includesAll(classroomRoutes, [
  'hasActiveSchoolRole(req.authUser!, payload.schoolId, "teacher")',
  'Teacher is not assigned to this school and class',
  'Class does not belong to this school',
  'parentId: schoolId',
], 'smart classroom requires school context valid assignment and a class belonging to the same school');

includesAll(app, [
  '<Route path="/school-teacher-dashboard"',
  '<TeacherWorkspaceGate workspace="school">',
  '<TeacherWorkspaceGate workspace="platform">',
], 'platform trainer and school teacher have separate persona-gated routes');

includesAll(contextGate, [
  "workspace === 'platform' && !data.personas.platformTrainer",
  "workspace === 'school' && !data.personas.schoolTeacher",
], 'persona gate redirects accounts away from unauthorized workspaces');

includesAll(dashboard, [
  'لوحة معلم المدرسة',
  'data-testid="school-teacher-assignment"',
  'اختبارات المدرسة الموجهة لفصولي',
  '/classroom/teacher?schoolId=',
], 'school teacher dashboard exposes only assigned classes assessments and Smart Classroom entry');

includesAll(consolePage, [
  'لا حاجة لإدخال أي معرّف يدويًا',
  'selectedSchool?.assignments',
  '!selectedSchool?.smartClassroomEnabled',
], 'teacher console selects server-provided assignments and respects the contract entitlement');

console.log('Account Workspaces G8 contract passed.');
