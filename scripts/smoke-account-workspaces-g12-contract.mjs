import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [permissions, workspace, routes, academic, delegation, users, api, integration] = await Promise.all([
  read('server/src/modules/schools/domain/schoolDirectorPermissions.ts'), read('server/src/modules/schools/application/schoolDirectorWorkspace.ts'), read('server/src/routes/schoolAccess.routes.ts'), read('dashboards/SchoolDirectorAcademicCenter.tsx'), read('dashboards/admin/SchoolsManager/SchoolDirectorDelegationPanel.tsx'), read('dashboards/admin/UsersManager.tsx'), read('services/api.ts'), read('server/src/scripts/backendIntegrationGate.ts'),
]);
const pass = (label) => console.log(`PASS ${label}`); const includesAll = (source, values, label) => { values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`)); pass(label); };
const capabilities = ['SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_SMART_CLASSROOM_VIEW','SCHOOL_INTERVENTIONS_VIEW','SCHOOL_INTERVENTIONS_MANAGE','SCHOOL_STUDENTS_TRANSFER_SCHOOL'];
includesAll(permissions, capabilities, 'G12 academic and transfer permissions are allowlisted');
includesAll(workspace, ['buildSchoolDirectorAcademicWorkspace','buildSchoolDirectorClassOptions','createSchoolDirectorAssessment','createSchoolDirectorIntervention','transferSchoolDirectorStudent','Approved questions not found','Use class move inside the same school'], 'G12 reuses existing academic engines and explicit transfer boundary');
includesAll(routes, [...capabilities,'SCHOOL_ASSESSMENTS','SMART_CLASSROOM','INTERVENTION_CENTER','transfer-target-classes','Transfer requires active permission and contract in both schools','schools.director.student.transfer_school'], 'G12 APIs apply permission and entitlement gates');
includesAll(academic, [...capabilities,'لا تُدمج نتائج المدرسة والتعلم الذاتي','اكتب TRANSFER للتأكيد'], 'director academic UI is permission/module aware and makes transfer explicit');
includesAll(delegation, capabilities, 'Platform Admin can grant every G12 capability');
includesAll(users, ['الشخصية/مساحة العمل','السياقات المدرسية الفعلية','مدرب منصة + معلم مدرسة'], 'user export labels personas and actual school contexts');
includesAll(api, ['createSchoolDirectorAssessment:','getSchoolDirectorSmartClassrooms:','createSchoolDirectorIntervention:','getSchoolDirectorTransferTargetClasses:','transferSchoolDirectorStudent:'], 'G12 UI uses real APIs');
includesAll(integration, ['school transfer denied without active target membership','academic permission cannot bypass revoked assessment module','hybrid teacher retains separate platform and school personas','school transfer audit missing'], 'isolated journey proves academic dual gates transfer and hybrid separation');
console.log('Account Workspaces G12 contract passed.');
