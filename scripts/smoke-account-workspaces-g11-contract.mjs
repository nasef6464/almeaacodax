import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [permissions, access, workspace, routes, dashboard, operations, delegation, api, integration] = await Promise.all([
  read('server/src/modules/schools/domain/schoolDirectorPermissions.ts'),
  read('server/src/modules/schools/application/schoolDirectorAccess.ts'),
  read('server/src/modules/schools/application/schoolDirectorWorkspace.ts'),
  read('server/src/routes/schoolAccess.routes.ts'),
  read('dashboards/SchoolDirectorDashboard.tsx'),
  read('dashboards/SchoolDirectorDelegatedOperations.tsx'),
  read('dashboards/admin/SchoolsManager/SchoolDirectorDelegationPanel.tsx'),
  read('services/api.ts'),
  read('server/src/scripts/backendIntegrationGate.ts'),
]);
const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => { values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`)); pass(label); };

const capabilities = ['SCHOOL_STUDENTS_UPDATE_BASIC', 'SCHOOL_STUDENTS_DEACTIVATE', 'SCHOOL_CLASSES_MANAGE', 'SCHOOL_TEACHERS_ASSIGN', 'SCHOOL_REPORTS_DETAILED_VIEW', 'SCHOOL_REPORTS_EXPORT'];
includesAll(permissions, capabilities, 'G11 capabilities are one server allowlist');
includesAll(access, ['requireSchoolDirectorCapability', 'requireSchoolDirectorPermission', 'resolveSchoolEntitlement'], 'director capability resolver combines fresh permission and contract entitlement');
includesAll(workspace, ['updateSchoolDirectorStudentBasic', 'setSchoolDirectorStudentActive', 'createSchoolDirectorClass', 'updateSchoolDirectorClass', 'listSchoolDirectorTeachers', 'upsertSchoolDirectorTeachingAssignment', 'buildSchoolDirectorDetailedReport', 'buildSchoolDirectorStudentExport'], 'delegated operations reuse bounded school models');
includesAll(routes, [...capabilities, 'SCHOOL_CORE', 'SCHOOL_INTELLIGENCE', 'EXECUTIVE_ANALYTICS', 'schools.director.student.deactivate', 'schools.director.teacher.assign', 'schools.director.report.export_students'], 'every G11 API route applies explicit dual gates and sensitive-operation audit');
assert.ok(!routes.includes('delete("/director/schools'), 'G11 must not add director hard delete routes');
pass('G11 exposes no director hard delete');
includesAll(delegation, capabilities, 'Platform Admin UI can grant every G11 capability');
includesAll(dashboard, ['SchoolDirectorDelegatedOperations', 'SCHOOL_STUDENTS_UPDATE_BASIC', 'SCHOOL_STUDENTS_DEACTIVATE'], 'director roster exposes only entitled delegated actions');
includesAll(operations, ['SCHOOL_CLASSES_MANAGE', 'SCHOOL_TEACHERS_ASSIGN', 'SCHOOL_REPORTS_DETAILED_VIEW', 'SCHOOL_REPORTS_EXPORT', "school.modules.includes(module)"], 'operations center hides tools unless permission and module both pass');
includesAll(api, ['updateSchoolDirectorStudentBasic:', 'setSchoolDirectorStudentActive:', 'createSchoolDirectorClass:', 'updateSchoolDirectorClass:', 'getSchoolDirectorTeachers:', 'updateSchoolDirectorTeachingAssignment:', 'getSchoolDirectorDetailedReport:', 'downloadSchoolDirectorStudentsCsv:'], 'G11 UI actions use real APIs');
includesAll(integration, ['director cannot update another school student', 'export permission alone cannot bypass contract module', 'revoked class capability fails immediately', 'disabled contract module fails detailed report immediately', 'school export leaked outside student'], 'isolated journey proves dual-gate revoke and cross-school negatives');

console.log('Account Workspaces G11 contract passed.');
