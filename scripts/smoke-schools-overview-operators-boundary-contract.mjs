import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const manager = read('dashboards/admin/SchoolsManager.tsx');
const studentPanel = read('dashboards/admin/SchoolsManager/SchoolSingleStudentPanel.tsx');
const supervisorPanel = read('dashboards/admin/SchoolsManager/SchoolWideSupervisorsPanel.tsx');

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

check('manager delegates single-student presentation while keeping mutation ownership', () => {
  assertIncludes(manager, "import { SchoolSingleStudentPanel } from './SchoolsManager/SchoolSingleStudentPanel';");
  assertIncludes(manager, '<SchoolSingleStudentPanel');
  assertIncludes(manager, 'student={singleStudent}');
  assertIncludes(manager, 'onSubmit={() => void handleAddSingleStudent()}');
  assertIncludes(manager, "onCreateFirstClass={() => handleCreateSingleClass('تم إنشاء فصل جديد. اختره من حقل فصل الطالب ثم أضف الطالب.')}");
  assertIncludes(manager, 'const handleAddSingleStudent = async () => {');
  assertNotIncludes(manager, '<div data-testid="school-students-panel"');
});

check('single-student child preserves operator labels and fields', () => {
  assertIncludes(studentPanel, 'data-testid="school-students-panel"');
  assertIncludes(studentPanel, 'data-testid="school-student-needs-class-note"');
  assertIncludes(studentPanel, 'data-testid="school-single-student-name"');
  assertIncludes(studentPanel, 'data-testid="school-single-student-email"');
  assertIncludes(studentPanel, 'data-testid="school-single-student-class"');
  assertIncludes(studentPanel, 'data-testid="school-single-student-password"');
  assertIncludes(studentPanel, 'data-testid="school-single-student-submit"');
  assertIncludes(studentPanel, 'إضافة طالب منفرد');
  assertIncludes(studentPanel, 'ابدأ بفصل واحد قبل إضافة الطلاب');
  assertIncludes(studentPanel, 'إضافة الطالب');
});

check('single-student child remains presentation-only', () => {
  assertNotIncludes(studentPanel, 'useStore');
  assertNotIncludes(studentPanel, "from '../../../services/api'");
  assertNotIncludes(studentPanel, 'api.');
  assertNotIncludes(studentPanel, 'handleAddSingleStudent');
  assertNotIncludes(studentPanel, 'createGroupAsync');
  assertIncludes(studentPanel, "onChangeField('name', event.target.value)");
  assertIncludes(studentPanel, 'void onSubmit()');
});

check('manager delegates school-wide supervisor presentation while keeping confirmations and mutations', () => {
  assertIncludes(manager, "import { SchoolWideSupervisorsPanel } from './SchoolsManager/SchoolWideSupervisorsPanel';");
  assertIncludes(manager, '<SchoolWideSupervisorsPanel');
  assertIncludes(manager, 'onAssignSupervisor={(value) => handleAssignSchoolSupervisor(value, selectedSchool.id)}');
  assertIncludes(manager, 'onRemoveSupervisor={handleRemoveSchoolWideSupervisor}');
  assertIncludes(manager, 'const handleRemoveSchoolWideSupervisor = (currentUser: User) => {');
  assertIncludes(manager, 'handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id)');
  assertIncludes(manager, 'const handleAssignSchoolSupervisor = async (supervisorId: string, groupId: string) => {');
  assertIncludes(manager, 'const handleRemoveSchoolSupervisor = async (supervisorId: string, groupId: string) => {');
  assertNotIncludes(manager, '<div data-testid="school-wide-supervisors-panel"');
});

check('school-wide supervisor child preserves scope presentation and controls', () => {
  assertIncludes(supervisorPanel, 'data-testid="school-wide-supervisors-panel"');
  assertIncludes(supervisorPanel, 'data-testid="school-supervisor-scope-decision"');
  assertIncludes(supervisorPanel, 'data-testid="school-supervisor-schoolwide-count"');
  assertIncludes(supervisorPanel, 'data-testid="school-supervisor-class-count"');
  assertIncludes(supervisorPanel, 'data-testid="school-supervisor-single-entry-note"');
  assertIncludes(supervisorPanel, 'data-testid="school-open-supervisor-entry"');
  assertIncludes(supervisorPanel, 'data-testid="school-remove-school-supervisor"');
  assertIncludes(supervisorPanel, 'data-testid="school-supervisor-scope-summary"');
  assertIncludes(supervisorPanel, 'مدير/مشرف المدرسة كاملة');
  assertIncludes(supervisorPanel, 'مشرف فصول محددة');
  assertIncludes(supervisorPanel, 'يرى المدرسة كاملة');
});

check('school-wide supervisor child remains presentation-only with explicit callbacks', () => {
  assertNotIncludes(supervisorPanel, 'useStore');
  assertNotIncludes(supervisorPanel, "from '../../../services/api'");
  assertNotIncludes(supervisorPanel, 'api.');
  assertNotIncludes(supervisorPanel, 'assignSupervisorToGroupAsync');
  assertNotIncludes(supervisorPanel, 'removeSupervisorFromGroupAsync');
  assertNotIncludes(supervisorPanel, 'handleAssignSchoolSupervisor');
  assertNotIncludes(supervisorPanel, 'handleRemoveSchoolSupervisor');
  assertIncludes(supervisorPanel, 'onAssignSupervisor(value).finally');
  assertIncludes(supervisorPanel, 'onRemoveSupervisor(currentUser)');
});

check('overview operator extraction reduces manager hotspot without creating oversized children', () => {
  const managerLines = manager.split('\n').length;
  const studentLines = studentPanel.split('\n').length;
  const supervisorLines = supervisorPanel.split('\n').length;
  if (managerLines >= 3620) throw new Error(`SchoolsManager remained too large after overview operator extraction: ${managerLines}`);
  if (studentLines > 170) throw new Error(`SchoolSingleStudentPanel exceeded 170 lines: ${studentLines}`);
  if (supervisorLines > 190) throw new Error(`SchoolWideSupervisorsPanel exceeded 190 lines: ${supervisorLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'schools-overview-operators-presentation-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  managerLines: manager.split('\n').length,
  studentPanelLines: studentPanel.split('\n').length,
  supervisorPanelLines: supervisorPanel.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
