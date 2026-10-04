import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const classesPanel = read('dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx');
const card = read('dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx');
const peopleManager = read('dashboards/admin/SchoolsManager/SchoolClassPeopleManager.tsx');
const peopleActions = read('dashboards/admin/SchoolsManager/useSchoolClassPeopleActions.ts');
const classLifecycleActions = read('dashboards/admin/SchoolsManager/schoolClassLifecycleActions.ts');
const rosterAssignmentActions = read('dashboards/admin/SchoolsManager/schoolRosterAssignmentActions.ts');
const api = read('services/api.ts');
const importRoutes = read('server/src/modules/content/http/contentSchoolReportImportRoutes.ts');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('manager delegates classes shell and classes panel owns the in-place class people experience', () => {
  assertIncludes(manager, "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';");
  assertIncludes(manager, '<SchoolClassesPanel');
  assertNotIncludes(manager, "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';");
  assertNotIncludes(manager, "import { SchoolClassPeopleManager } from './SchoolsManager/SchoolClassPeopleManager';");
  assertIncludes(classesPanel, "import { SchoolClassOperatingCard } from './SchoolClassOperatingCard';");
  assertIncludes(classesPanel, "import { SchoolClassPeopleManager } from './SchoolClassPeopleManager';");
  assertIncludes(classesPanel, "import { useSchoolClassPeopleActions } from './useSchoolClassPeopleActions';");
  assertIncludes(classesPanel, '<SchoolClassOperatingCard');
  assertIncludes(classesPanel, '<SchoolClassPeopleManager');
  assertIncludes(classesPanel, "setPeopleManager({ classId: classroom.id, section })");
});

check('class card exposes compact student teacher supervisor management without navigation jumps', () => {
  assertIncludes(card, 'data-testid="school-class-card"');
  assertIncludes(card, 'data-testid="school-class-operating-actions"');
  assertIncludes(card, 'data-testid="school-class-manage-students"');
  assertIncludes(card, 'data-testid="school-class-manage-teachers"');
  assertIncludes(card, 'data-testid="school-class-manage-supervisors"');
  assertIncludes(card, 'data-testid="school-class-access"');
  assertIncludes(card, 'إدارة الطلاب');
  assertIncludes(card, 'إدارة المعلمين');
  assertIncludes(card, 'إدارة المشرفين');
  assertIncludes(card, 'محتوى وأكواد');
  assertNotIncludes(card, 'إسناد معلم موجود للفصل');
  assertNotIncludes(card, 'إسناد مشرف موجود للفصل');
  assertNotIncludes(card, 'onFocusStudentForm');
  assertNotIncludes(card, 'onFocusRoster');
});

check('class people manager supports existing new and bulk student workflows', () => {
  assertIncludes(peopleManager, 'طلاب موجودون في المدرسة');
  assertIncludes(peopleManager, 'إضافة المحددين');
  assertIncludes(peopleManager, 'إنشاء طالب جديد وربطه بهذا الفصل');
  assertIncludes(peopleManager, 'رفع كشف Excel للطلاب والفصول');
  assertIncludes(peopleManager, 'selectedStudentIds');
  assertIncludes(peopleManager, 'onAssignStudents(selectedStudentIds)');
  assertIncludes(peopleManager, 'onCreateStudent');
  assertIncludes(peopleManager, 'onRemoveStudent');
});

check('class people manager supports existing and new teacher and supervisor workflows', () => {
  assertIncludes(peopleManager, 'إضافة معلم مسجل على المنصة');
  assertIncludes(peopleManager, 'إنشاء معلم جديد وربطه بهذا الفصل');
  assertIncludes(peopleManager, 'إضافة مشرف مسجل على المنصة');
  assertIncludes(peopleManager, 'إنشاء مشرف جديد وربطه بهذا الفصل');
  assertIncludes(peopleManager, 'canUseInSchool');
  assertIncludes(peopleManager, 'onAssignTeacher');
  assertIncludes(peopleManager, 'onCreateTeacher');
  assertIncludes(peopleManager, 'onAssignSupervisor');
  assertIncludes(peopleManager, 'onCreateSupervisor');
});

check('class people actions write canonical authority and compatibility links then reload server truth', () => {
  assertIncludes(api, 'updateSchoolMembership');
  assertIncludes(peopleActions, 'api.updateSchoolMembership');
  assertIncludes(peopleActions, 'api.updateTeachingAssignment');
  assertIncludes(peopleActions, 'assignStudentToGroupAsync');
  assertIncludes(peopleActions, 'assignTeacherToGroupAsync');
  assertIncludes(peopleActions, 'assignSupervisorToGroupAsync');
  assertIncludes(peopleActions, 'removeStudentFromGroupAsync');
  assertIncludes(peopleActions, 'removeTeacherFromGroupAsync');
  assertIncludes(peopleActions, 'removeSupervisorFromGroupAsync');
  assertIncludes(peopleActions, 'api.getOperationalBootstrapFresh()');
  assertIncludes(peopleActions, 'loadSchoolAdminUsers()');
  assertIncludes(peopleActions, 'hydrateContentBootstrap');
  assertIncludes(peopleActions, 'hydrateUsers');
});

check('school student import also creates canonical student membership', () => {
  assertIncludes(importRoutes, 'SchoolMembershipModel');
  assertIncludes(importRoutes, 'role: "student"');
  assertIncludes(importRoutes, '{ $set: { status: "active" } }');
  assertIncludes(importRoutes, 'setDefaultsOnInsert: true');
});

check('class operating card remains presentation-only', () => {
  assertNotIncludes(card, 'useStore');
  assertNotIncludes(card, "from '../../../services/api'");
  assertNotIncludes(card, 'api.');
  assertNotIncludes(card, 'updateGroupAsync');
  assertNotIncludes(card, 'setActiveTab');
  assertIncludes(card, 'onManageStudents');
  assertIncludes(card, 'onManageTeachers');
  assertIncludes(card, 'onManageSupervisors');
});

check('class rename delete and legacy scope confirmations remain in extracted orchestration', () => {
  assertIncludes(manager, 'createSchoolClassRenameAction({');
  assertIncludes(manager, 'createSchoolClassLifecycleActions({');
  assertIncludes(manager, 'createSchoolRosterAssignmentActions({');
  assertIncludes(classLifecycleActions, 'export const createSchoolClassRenameAction');
  assertIncludes(classLifecycleActions, 'await updateGroupAsync(classroom.id, { name: newName.trim() });');
  assertIncludes(classLifecycleActions, 'await deleteGroupAsync(classroom.id);');
  assertIncludes(classLifecycleActions, 'await refreshSchoolWorkspace(selectedSchool.id);');
  assertIncludes(rosterAssignmentActions, 'confirmRemoveClassSupervisor');
  assertIncludes(rosterAssignmentActions, 'api.updateSchoolMembership');
  assertIncludes(rosterAssignmentActions, 'api.updateTeachingAssignment');
});

check('extraction keeps the school manager and class shell bounded', () => {
  const managerLines = manager.split('\n').length;
  const classesPanelLines = classesPanel.split('\n').length;
  const cardLines = card.split('\n').length;
  const peopleManagerLines = peopleManager.split('\n').length;
  const peopleActionsLines = peopleActions.split('\n').length;
  const lifecycleLines = classLifecycleActions.split('\n').length;
  const rosterActionsLines = rosterAssignmentActions.split('\n').length;
  if (managerLines >= 3900) throw new Error(`SchoolsManager remained too large: ${managerLines}`);
  if (classesPanelLines > 240) throw new Error(`SchoolClassesPanel exceeded 240 lines: ${classesPanelLines}`);
  if (cardLines > 240) throw new Error(`SchoolClassOperatingCard exceeded 240 lines: ${cardLines}`);
  if (peopleManagerLines > 380) throw new Error(`SchoolClassPeopleManager exceeded 380 lines: ${peopleManagerLines}`);
  if (peopleActionsLines > 300) throw new Error(`useSchoolClassPeopleActions exceeded 300 lines: ${peopleActionsLines}`);
  if (lifecycleLines > 260) throw new Error(`schoolClassLifecycleActions exceeded 260 lines: ${lifecycleLines}`);
  if (rosterActionsLines > 300) throw new Error(`schoolRosterAssignmentActions exceeded 300 lines: ${rosterActionsLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-class-people-manager-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
