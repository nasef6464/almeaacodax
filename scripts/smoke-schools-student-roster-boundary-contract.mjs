import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const rosterFile = 'dashboards/admin/SchoolsManager/SchoolStudentRosterPanel.tsx';
const viewModelFile = 'dashboards/admin/SchoolsManager/rosterViewModel.ts';
const manager = read(managerFile);
const roster = read(rosterFile);
const viewModel = read(viewModelFile);

assert.ok(roster.includes('export const SchoolStudentRosterPanel'), 'student roster panel must be feature-owned');
assert.ok(!roster.includes("from '../../../services/api'"), 'student roster panel must not call API directly');
assert.ok(!roster.includes("from '../../../store/useStore'"), 'student roster panel must not own global store');
assert.ok(roster.includes("import type { SchoolRosterClassFilter } from './rosterViewModel';"), 'roster filter contract must use feature view-model type');
for (const contract of [
  'data-testid="school-roster-panel"',
  'طلاب المدرسة',
  'ابحث بالاسم أو البريد...',
  '<option value="all">كل الفصول</option>',
  '<option value="unassigned">طلاب بدون فصل</option>',
  'لا يوجد طلاب مطابقون للبحث الحالي داخل هذه المدرسة.',
  'data-testid="school-student-remove-class"',
  'data-testid="school-student-remove-school"',
  'إخراج من الفصل',
  'إزالة من المدرسة',
  'صفحة {safeSchoolStudentPage} / {schoolStudentTotalPages}',
]) {
  assert.ok(roster.includes(contract), `student roster behavior must remain visible: ${contract}`);
}
assert.ok(roster.includes('handleAssignStudentToClass(student.id, value)'), 'class reassignment callback must remain wired');
assert.ok(roster.includes('handleRemoveStudentScope(student.id, currentClass.id)'), 'class removal callback must remain wired');
assert.ok(roster.includes('handleRemoveStudentScope(student.id, selectedSchoolId)'), 'school removal callback must remain wired');
assert.ok(roster.includes('window.confirm'), 'destructive roster actions must keep confirmation');
assert.ok(roster.includes('disabled={Boolean(rosterActionPending)}'), 'roster mutations must remain guarded while pending');
assert.ok(lineCount(roster) <= 260, `SchoolStudentRosterPanel must stay <= 260 lines; got ${lineCount(roster)}`);

assert.ok(manager.includes("from './SchoolsManager/SchoolStudentRosterPanel';"), 'SchoolsManager must compose student roster panel');
assert.ok(manager.includes('<SchoolStudentRosterPanel'), 'SchoolsManager must render student roster panel');
assert.ok(!manager.includes('data-testid="school-roster-panel"'), 'roster markup must not return to manager');
assert.ok(!manager.includes('pagedVisibleSchoolStudents.map((student)'), 'student row rendering must remain outside manager');
assert.ok(lineCount(manager) <= 3950, `SchoolsManager roster extraction regression: ${lineCount(manager)} lines exceeds 3950.`);

assert.ok(viewModel.includes('const schoolClassIds = new Set'), 'unassigned roster filtering must remain O(students + classes)');
assert.ok(viewModel.includes('pagedVisibleSchoolStudents'), 'roster pagination projection must remain in pure view-model');

for (const [file, source] of [[rosterFile, roster]]) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  const diagnostics = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(diagnostics.length, 0, `${file} must transpile without syntax diagnostics`);
}

console.log(JSON.stringify({
  phase: 'schools-student-roster-boundary',
  status: 'PASS',
  managerLines: lineCount(manager),
  rosterLines: lineCount(roster),
}, null, 2));
