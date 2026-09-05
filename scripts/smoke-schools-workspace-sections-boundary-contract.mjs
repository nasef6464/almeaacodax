import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const coursesPanel = read('dashboards/admin/SchoolsManager/SchoolCoursesPanel.tsx');
const classesPanel = read('dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx');

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

check('manager delegates school course presentation', () => {
  assertIncludes(manager, "import { SchoolCoursesPanel } from './SchoolsManager/SchoolCoursesPanel';");
  assertIncludes(manager, '<SchoolCoursesPanel');
  assertIncludes(manager, 'onAssignCourse={handleAssignCourseToSchool}');
  assertIncludes(manager, 'onRemoveCourse={handleRemoveCourseFromSchool}');
  assertNotIncludes(manager, '<h3 className="text-lg font-bold text-gray-900">دورات المدرسة</h3>');
});

check('school course mutations remain in manager orchestration', () => {
  assertIncludes(manager, 'const handleAssignCourseToSchool = (courseId: string) => {');
  assertIncludes(manager, 'assignCourseToGroup(courseId, selectedSchool.id);');
  assertIncludes(manager, 'const handleRemoveCourseFromSchool = (courseId: string) => {');
  assertIncludes(manager, 'removeCourseFromGroup(courseId, selectedSchool.id);');
  assertIncludes(manager, 'setSelectedSchool((current) =>');
  assertNotIncludes(coursesPanel, 'assignCourseToGroup');
  assertNotIncludes(coursesPanel, 'removeCourseFromGroup');
  assertNotIncludes(coursesPanel, 'setSelectedSchool');
});

check('manager delegates classes presentation and mutations by callback', () => {
  assertIncludes(manager, "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';");
  assertIncludes(manager, '<SchoolClassesPanel');
  assertIncludes(manager, 'onCreateBulkClasses={handleCreateBulkClasses}');
  assertIncludes(manager, 'onDownloadClassReport={downloadClassReport}');
  assertIncludes(manager, 'onRenameClass={openClassRenameModal}');
  assertIncludes(manager, 'onAssignSupervisor={handleAssignSchoolSupervisor}');
  assertIncludes(manager, 'onRemoveSupervisor={confirmRemoveClassSupervisor}');
  assertIncludes(manager, 'onAssignCourse={assignCourseToGroup}');
  assertIncludes(manager, 'onRemoveCourse={removeCourseFromGroup}');
  assertNotIncludes(manager, 'data-testid="school-class-creation-panel"');
});

check('classes panel preserves class creation and operating presentation', () => {
  assertIncludes(classesPanel, 'data-testid="school-classes-panel"');
  assertIncludes(classesPanel, 'data-testid="school-class-creation-panel"');
  assertIncludes(classesPanel, 'تصدير كشف الطلاب');
  assertIncludes(classesPanel, 'إضافة فصل');
  assertIncludes(classesPanel, 'إنشاء عدة فصول مرة واحدة');
  assertIncludes(classesPanel, '<SchoolClassOperatingCard');
  assertIncludes(classesPanel, 'onAssignSupervisor={(userId) => onAssignSupervisor(userId, classroom.id)}');
  assertIncludes(classesPanel, 'onAssignCourse={(courseId) => onAssignCourse(courseId, classroom.id)}');
});

check('workspace section children remain presentation-only', () => {
  for (const [name, source] of [['courses', coursesPanel], ['classes', classesPanel]]) {
    assertNotIncludes(source, 'useStore', `${name} panel imports store`);
    assertNotIncludes(source, "from '../../../services/api'", `${name} panel imports API`);
    assertNotIncludes(source, 'api.', `${name} panel calls API directly`);
    assertNotIncludes(source, 'updateGroupAsync', `${name} panel owns group update mutation`);
    assertNotIncludes(source, 'deleteGroupAsync', `${name} panel owns group delete mutation`);
  }
});

check('extraction reduces manager hotspot without creating oversized children', () => {
  const managerLines = manager.split('\n').length;
  const coursesLines = coursesPanel.split('\n').length;
  const classesLines = classesPanel.split('\n').length;
  if (managerLines >= 3800) throw new Error(`SchoolsManager remained too large: ${managerLines}`);
  if (coursesLines > 120) throw new Error(`SchoolCoursesPanel exceeded 120 lines: ${coursesLines}`);
  if (classesLines > 260) throw new Error(`SchoolClassesPanel exceeded 260 lines: ${classesLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-workspace-sections-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  coursesLines: coursesPanel.split('\n').length,
  classesLines: classesPanel.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
