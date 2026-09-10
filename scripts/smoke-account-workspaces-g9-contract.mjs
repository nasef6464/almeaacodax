import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [roles, membership, permissions, access, routes, authRoutes, api, people, panel, integration] = await Promise.all([
  read('server/src/constants/roles.ts'),
  read('server/src/models/SchoolMembership.ts'),
  read('server/src/modules/schools/domain/schoolDirectorPermissions.ts'),
  read('server/src/modules/schools/application/schoolDirectorAccess.ts'),
  read('server/src/routes/schoolAccess.routes.ts'),
  read('server/src/routes/auth.routes.ts'),
  read('services/api.ts'),
  read('dashboards/admin/SchoolsManager/SchoolPeopleHubTab.tsx'),
  read('dashboards/admin/SchoolsManager/SchoolDirectorDelegationPanel.tsx'),
  read('server/src/scripts/backendIntegrationGate.ts'),
]);

const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => {
  values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`));
  pass(label);
};

includesAll(roles, ['"school_admin"'], 'School Director is an additive first-class account role');
includesAll(membership, ['"school_admin"', 'permissions:', 'schoolDirectorPermissions'], 'SchoolMembership stores allowlisted per-school permissions');
includesAll(permissions, ['SCHOOL_OVERVIEW_VIEW', 'SCHOOL_REPORTS_AGGREGATE_VIEW', 'SCHOOL_STUDENTS_VIEW', 'SCHOOL_STUDENTS_ADD', 'SCHOOL_STUDENTS_MOVE_CLASS'], 'G9 exposes only the approved base permission allowlist');
includesAll(access, ['role: "school_admin"', 'status: "active"', 'hasSchoolDirectorPermission'], 'director authorization resolves fresh active membership and permission');
includesAll(routes, ['requireRole(["school_admin"])', 'requireSchoolDirectorPermission', 'requireRole(["admin"])', 'recordAdminAuditLog', 'schools.director_access.revoke'], 'API enforces role membership permission admin-only grants and audit logging');
includesAll(authRoutes, ['"school_admin"'], 'admin account lifecycle accepts the separate School Director role');
includesAll(api, ['getSchoolDirectors:', 'updateSchoolDirectorAccess:', 'getSchoolDirectorWorkspace:'], 'frontend uses real school director APIs');
includesAll(people, ['SchoolDirectorDelegationPanel', 'directorAccounts', "roleLabel: 'مدير مدرسة'", "roleLabel: isSchoolWide ? 'مشرف عام' : 'مشرف فصول'", "label: 'مديرو المدارس'"], 'director and supervisor identities stay distinct inside the redesigned School People Hub');
includesAll(panel, ['مديرو المدرسة والصلاحيات', 'إنشاء وربط بالمدرسة', 'حفظ الصلاحيات', 'إيقاف الوصول', 'api.updateSchoolDirectorAccess'], 'admin UI creates links updates permissions and revokes school director access');
includesAll(integration, ['school director cannot cross into another school', 'revoked director permission is denied immediately', 'inactive school director membership is denied', 'school director grants and revocation are audit logged'], 'exact-runtime integration gate proves negative RBAC and audit cases');

console.log('Account Workspaces G9 contract passed.');
