import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sourceFile = 'dashboards/admin/SchoolsManager/relationshipViewModel.ts';
const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const source = read(sourceFile);
const manager = read(managerFile);

assert.ok(source.split(/\r?\n/).length <= 220, 'Relationship view model must stay <= 220 lines.');
assert.ok(!source.includes('useState(') && !source.includes('useMemo('), 'Relationship view model must remain React-independent.');
assert.ok(manager.includes("from './SchoolsManager/relationshipViewModel';"), 'SchoolsManager must delegate relationship calculations.');
assert.ok(!manager.includes('const schoolGroupIds = new Set([selectedSchool.id'), 'School group relationship computation must leave the component.');
assert.ok(!manager.includes('const classOperatingRows = schoolClasses.map((classroom) => {'), 'Class operating rows must leave the component.');

const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const errors = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, 'Relationship view model must transpile without diagnostics.');
const viewModel = await import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`);

const school = {
  id: 'school-1', name: 'مدرسة الإنتاج', type: 'SCHOOL',
  supervisorIds: ['sup-school'], studentIds: ['student-school'], courseIds: [],
};
const classA = {
  id: 'class-a', name: 'الأول أ', type: 'CLASS', parentId: school.id,
  supervisorIds: ['sup-class-list'], studentIds: ['student-class-list'], courseIds: [],
};
const classB = {
  id: 'class-b', name: 'الثاني ب', type: 'CLASS', parentId: school.id,
  supervisorIds: [], studentIds: [], courseIds: [],
};
const schoolStudents = [
  { id: 'student-school', name: 'طالب مدرسة', groupIds: [school.id] },
  { id: 'student-class-list', name: 'طالب قائمة الفصل', groupIds: [] },
  { id: 'student-class-group', name: 'طالب عضوية الفصل', groupIds: [classA.id] },
  { id: 'student-no-class', name: 'طالب بلا فصل', groupIds: [] },
];
const supervisors = [
  { id: 'sup-school', name: 'مشرف المدرسة', groupIds: [] },
  { id: 'sup-school-group', name: 'مشرف بنطاق المدرسة', groupIds: [school.id] },
  { id: 'sup-class-list', name: 'مشرف قائمة الفصل', groupIds: [] },
  { id: 'sup-class-group', name: 'مشرف عضوية الفصل', groupIds: [classA.id] },
  { id: 'sup-unrelated', name: 'مشرف خارجي', groupIds: ['class-x'] },
];
const parents = [
  { id: 'parent-1', name: 'ولي 1', linkedStudentIds: ['student-school'] },
  { id: 'parent-2', name: 'ولي 2', linkedStudentIds: ['student-class-group'] },
  { id: 'parent-unrelated', name: 'ولي خارجي', linkedStudentIds: ['outside-student'] },
];

const result = viewModel.buildSchoolRelationshipViewModel({
  school,
  schoolClasses: [classA, classB],
  schoolStudents,
  supervisors,
  parents,
});

assert.deepEqual(
  result.schoolSupervisors.map((item) => item.id),
  ['sup-school', 'sup-school-group', 'sup-class-list', 'sup-class-group'],
  'Supervisor inclusion must preserve school IDs, school memberships, class IDs and class memberships.',
);
assert.deepEqual(
  result.schoolLevelSupervisors.map((item) => item.id),
  ['sup-school', 'sup-school-group'],
  'School-wide supervisors must remain distinct from class-scoped supervisors.',
);
assert.deepEqual(
  result.classScopedSupervisors.map((item) => item.id),
  ['sup-class-list', 'sup-class-group'],
);
assert.deepEqual(result.schoolParentUsers.map((item) => item.id), ['parent-1', 'parent-2']);
assert.deepEqual(
  result.studentsWithoutParent.map((item) => item.id),
  ['student-class-list', 'student-no-class'],
  'Students without parent links must be preserved.',
);
assert.deepEqual(
  result.studentsWithoutClass.map((item) => item.id),
  ['student-school', 'student-class-list', 'student-no-class'],
  'Only groupIds class membership defines the existing unassigned-student signal.',
);
assert.deepEqual(
  result.supervisorsWithoutClass.map((item) => item.id),
  ['sup-school', 'sup-school-group'],
  'School-wide supervisors without class assignment must remain visible in the gap signal.',
);

const classARow = result.classOperatingRows.find((row) => row.classroom.id === classA.id);
assert.equal(classARow.studentCount, 2);
assert.equal(classARow.supervisorCount, 2);
assert.equal(classARow.studentsWithoutParentCount, 1);
assert.deepEqual(classARow.gaps, ['1 بلا ولي أمر']);
assert.equal(classARow.isReady, true);

const classBRow = result.classOperatingRows.find((row) => row.classroom.id === classB.id);
assert.equal(classBRow.studentCount, 0);
assert.equal(classBRow.supervisorCount, 0);
assert.deepEqual(classBRow.gaps, ['لا يوجد طلاب', 'لا يوجد مشرف فصل']);
assert.equal(classBRow.isReady, false);

const schoolScope = result.supervisorScopeRows.find((row) => row.user.id === 'sup-school-group');
assert.equal(schoolScope.isSchoolWide, true);
assert.equal(schoolScope.scopeDetails, school.name);
const classScope = result.supervisorScopeRows.find((row) => row.user.id === 'sup-class-group');
assert.equal(classScope.isSchoolWide, false);
assert.equal(classScope.scopeDetails, classA.name);

console.log(JSON.stringify({
  phase: 'schools-relationship-viewmodel',
  status: 'PASS',
  supervisorsCovered: result.schoolSupervisors.length,
  classRowsCovered: result.classOperatingRows.length,
  parentLinksCovered: result.schoolParentUsers.length,
}, null, 2));
