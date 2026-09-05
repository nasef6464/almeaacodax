import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const classesPanel = read('dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx');
const card = read('dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx');
const classLifecycleActions = read('dashboards/admin/SchoolsManager/schoolClassLifecycleActions.ts');
const rosterAssignmentActions = read('dashboards/admin/SchoolsManager/schoolRosterAssignmentActions.ts');

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

check('manager delegates classes shell and classes panel delegates class operating-card presentation', () => {
  assertIncludes(manager, "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';");
  assertIncludes(manager, '<SchoolClassesPanel');
  assertIncludes(manager, 'onAssignSupervisor={handleAssignSchoolSupervisor}');
  assertIncludes(manager, 'onRemoveSupervisor={confirmRemoveClassSupervisor}');
  assertIncludes(manager, 'onAssignTeacher={handleAssignTeacherToClass}');
  assertIncludes(manager, 'onRemoveTeacher={handleRemoveTeacherFromClass}');
  assertIncludes(manager, 'onAssignCourse={assignCourseToGroup}');
  assertIncludes(manager, 'onRemoveCourse={removeCourseFromGroup}');
  assertNotIncludes(manager, "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';");
  assertNotIncludes(manager, '<SchoolClassOperatingCard');
  assertIncludes(classesPanel, "import { SchoolClassOperatingCard } from './SchoolClassOperatingCard';");
  assertIncludes(classesPanel, '<SchoolClassOperatingCard');
  assertIncludes(classesPanel, 'classStudentCount={classStudents.length}');
  assertIncludes(classesPanel, 'studentsWithoutParentCount={classStudentsWithoutParent.length}');
  assertIncludes(classesPanel, 'onAssignSupervisor={(userId) => onAssignSupervisor(userId, classroom.id)}');
  assertIncludes(classesPanel, 'onRemoveSupervisor={(currentUser) => onRemoveSupervisor(classroom, currentUser)}');
  assertIncludes(classesPanel, 'onAssignTeacher={(userId) => onAssignTeacher(userId, classroom.id)}');
  assertIncludes(classesPanel, 'onRemoveTeacher={(currentUser) => onRemoveTeacher(classroom, currentUser)}');
  assertIncludes(classesPanel, 'onAssignCourse={(courseId) => onAssignCourse(courseId, classroom.id)}');
  assertIncludes(classesPanel, 'onRemoveCourse={(courseId) => onRemoveCourse(courseId, classroom.id)}');
  assertNotIncludes(manager, 'data-testid="school-class-card"');
  assertNotIncludes(manager, 'data-testid="school-class-operating-actions"');
});

check('class operating card keeps the existing operator actions and labels', () => {
  assertIncludes(card, 'data-testid="school-class-card"');
  assertIncludes(card, 'data-testid="school-class-operating-actions"');
  assertIncludes(card, 'data-testid="school-class-add-students"');
  assertIncludes(card, 'data-testid="school-class-roster"');
  assertIncludes(card, 'data-testid="school-class-import-students"');
  assertIncludes(card, 'data-testid="school-class-access"');
  assertIncludes(card, 'data-testid="school-class-create-supervisor"');
  assertIncludes(card, 'data-testid="school-remove-class-supervisor"');
  assertIncludes(card, 'إضافة طالب');
  assertIncludes(card, 'طلاب الفصل');
  assertIncludes(card, 'Excel للفصل');
  assertIncludes(card, 'محتوى وأكواد');
  assertIncludes(card, 'المشرف المسؤول');
  assertIncludes(card, 'الدورات المخصصة');
});

check('class operating card is presentation-only and receives explicit callbacks', () => {
  assertNotIncludes(card, 'useStore');
  assertNotIncludes(card, "from '../../../services/api'");
  assertNotIncludes(card, 'api.');
  assertNotIncludes(card, 'updateGroupAsync');
  assertNotIncludes(card, 'deleteGroupAsync');
  assertNotIncludes(card, 'assignCourseToGroup');
  assertNotIncludes(card, 'removeCourseFromGroup');
  assertNotIncludes(card, 'setActiveTab');
  assertIncludes(card, 'onAssignSupervisor(value).finally');
  assertIncludes(card, 'onRemoveSupervisor(currentUser)');
  assertIncludes(card, 'onAssignCourse(value)');
  assertIncludes(card, 'onRemoveCourse(course.id)');
});

check('class rename delete and supervisor confirmations remain in extracted orchestration', () => {
  assertIncludes(manager, 'createSchoolClassRenameAction({');
  assertIncludes(manager, 'createSchoolClassLifecycleActions({');
  assertIncludes(manager, 'createSchoolRosterAssignmentActions({');

  assertIncludes(classLifecycleActions, 'export const createSchoolClassRenameAction');
  assertIncludes(classLifecycleActions, 'await updateGroupAsync(classroom.id, { name: newName.trim() });');
  assertIncludes(classLifecycleActions, 'const handleDeleteClass = async (classroom: Group) => {');
  assertIncludes(classLifecycleActions, "window.confirm('هل أنت متأكد من حذف هذا الفصل؟')");
  assertIncludes(classLifecycleActions, 'await deleteGroupAsync(classroom.id);');
  assertIncludes(classLifecycleActions, 'await refreshSchoolWorkspace(selectedSchool.id);');

  assertIncludes(rosterAssignmentActions, 'const confirmRemoveClassSupervisor = (classroom: Group, currentUser: User) => {');
  assertIncludes(rosterAssignmentActions, 'void handleRemoveSchoolSupervisor(currentUser.id, classroom.id);');
  assertIncludes(rosterAssignmentActions, 'await removeSupervisorFromGroupAsync(supervisorId, groupId);');
  assertIncludes(rosterAssignmentActions, 'await refreshSchoolWorkspace(selectedSchool.id);');
});

check('extraction reduces the school manager hotspot without creating a new hotspot', () => {
  const managerLines = manager.split('\n').length;
  const classesPanelLines = classesPanel.split('\n').length;
  const cardLines = card.split('\n').length;
  const lifecycleLines = classLifecycleActions.split('\n').length;
  const rosterActionsLines = rosterAssignmentActions.split('\n').length;
  if (managerLines >= 3900) throw new Error(`SchoolsManager remained too large after class-card extraction: ${managerLines}`);
  if (classesPanelLines > 260) throw new Error(`SchoolClassesPanel exceeded 260 lines: ${classesPanelLines}`);
  if (cardLines > 300) throw new Error(`SchoolClassOperatingCard exceeded 300 lines: ${cardLines}`);
  if (lifecycleLines > 260) throw new Error(`schoolClassLifecycleActions exceeded 260 lines: ${lifecycleLines}`);
  if (rosterActionsLines > 300) throw new Error(`schoolRosterAssignmentActions exceeded 300 lines: ${rosterActionsLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-class-card-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  classesPanelLines: classesPanel.split('\n').length,
  cardLines: card.split('\n').length,
  classLifecycleLines: classLifecycleActions.split('\n').length,
  rosterActionsLines: rosterAssignmentActions.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
