import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workspace = read('server/src/modules/schools/application/schoolTeacherWorkspace.ts');
const supervisor = read('dashboards/admin/SupervisorDashboard.tsx');
const teacherContext = read('components/teacher/TeacherWorkspaceContext.tsx');
const teacherOverview = read('dashboards/school-teacher/SchoolTeacherPrimaryTabs.tsx');
const integration = read('server/src/scripts/backendIntegrationGate.ts');

const check = (condition, message) => {
  assert.ok(condition, message);
  console.log(`PASS ${message}`);
};

check(workspace.includes('select("name parentId studentIds")'), 'teacher workspace reads the authoritative class roster references');
check(workspace.includes('role: "student"') && workspace.includes('schoolId: { $in: schoolIds }'), 'teacher roster query is bounded to school students');
check(workspace.includes('groupIds: { $in: validClassIds }'), 'teacher roster query is bounded to assigned classes');
check(workspace.includes('studentCount: students.length') && workspace.includes('students,'), 'teacher workspace returns a count and safe roster projection');
check(teacherContext.includes('studentCount: number') && teacherContext.includes('studentId: string; name: string; isActive: boolean'), 'frontend workspace contract includes the safe roster projection');
check(teacherOverview.includes('طلاب فصولي المسندة') && teacherOverview.includes('مسجلون فعليًا في فصولك المسندة'), 'school teacher surface displays real assigned students');
check(supervisor.includes('const [scopedStudentUsers, setScopedStudentUsers]') && supervisor.includes('scopedStudentUsersLoaded ? scopedStudentUsers : users'), 'supervisor uses a server-scoped roster after it loads');
check(!supervisor.includes('hydrateUsers([...existingNonStudents, ...storeUsers])'), 'supervisor does not overwrite global users with a partial roster');
check(integration.includes('teacher workspace omitted the assigned class roster count') && integration.includes('teacher workspace roster leaked or omitted students outside the assigned class'), 'backend integration gate proves roster count and class isolation');

console.log('School roster runtime contract passed.');
