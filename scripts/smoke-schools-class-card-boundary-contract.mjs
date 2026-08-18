import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const card = read('dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx');

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

check('manager delegates class operating-card presentation', () => {
  assertIncludes(manager, "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';");
  assertIncludes(manager, '<SchoolClassOperatingCard');
  assertIncludes(manager, 'classStudentCount={classStudents.length}');
  assertIncludes(manager, 'studentsWithoutParentCount={classStudentsWithoutParent.length}');
  assertIncludes(manager, 'onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}');
  assertIncludes(manager, 'onRemoveSupervisor={(currentUser) => handleRemoveClassSupervisor(classroom, currentUser)}');
  assertIncludes(manager, 'onAssignCourse={(courseId) => assignCourseToGroup(courseId, classroom.id)}');
  assertIncludes(manager, 'onRemoveCourse={(courseId) => removeCourseFromGroup(courseId, classroom.id)}');
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

check('rename delete and supervisor confirmations remain in manager orchestration', () => {
  assertIncludes(manager, 'const openClassRenameModal = (classroom: Group) => {');
  assertIncludes(manager, 'await updateGroupAsync(classroom.id, { name: newName.trim() });');
  assertIncludes(manager, 'const handleDeleteClass = async (classroom: Group) => {');
  assertIncludes(manager, "window.confirm('هل أنت متأكد من حذف هذا الفصل؟')");
  assertIncludes(manager, 'await deleteGroupAsync(classroom.id);');
  assertIncludes(manager, 'const handleRemoveClassSupervisor = (classroom: Group, currentUser: User) => {');
  assertIncludes(manager, 'handleRemoveSchoolSupervisor(currentUser.id, classroom.id)');
});

check('extraction reduces the school manager hotspot without creating a new hotspot', () => {
  const managerLines = manager.split('\n').length;
  const cardLines = card.split('\n').length;
  if (managerLines >= 3900) throw new Error(`SchoolsManager remained too large after class-card extraction: ${managerLines}`);
  if (cardLines > 300) throw new Error(`SchoolClassOperatingCard exceeded 300 lines: ${cardLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-class-card-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  cardLines: card.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
