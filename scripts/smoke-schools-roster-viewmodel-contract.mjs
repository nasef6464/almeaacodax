import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager/rosterViewModel.ts'), 'utf8');
const managerSource = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager.tsx'), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

assert.ok(source.includes('buildSchoolRosterViewModel'), 'roster builder must be exported');
assert.ok(!source.includes('useState(') && !source.includes('useMemo('), 'roster view model must remain React-independent');
assert.ok(!source.includes("from '../../../services/api'"), 'roster view model must remain API-independent');
assert.ok(source.includes('new Set(schoolClasses.map'), 'unassigned filtering must use a class-id Set');
assert.ok(lineCount(source) <= 130, 'roster view model must stay <= 130 lines');
assert.ok(managerSource.includes("from './SchoolsManager/rosterViewModel';"), 'SchoolsManager must delegate roster projection');
assert.ok(managerSource.includes('buildSchoolRosterViewModel({'), 'SchoolsManager must call the extracted roster view model');
assert.ok(!managerSource.includes('const visibleSchoolStudents = schoolStudents.filter((student) => {'), 'inline roster filtering must not return to SchoolsManager');
assert.ok(lineCount(managerSource) <= 4350, `SchoolsManager roster regression: ${lineCount(managerSource)} lines exceeds the 4350-line safety budget`);

const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'roster view model must transpile cleanly');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const { buildSchoolRosterViewModel } = await import(moduleUrl);

const classes = [
  { id: 'c1', name: 'الأول أ' },
  { id: 'c2', name: 'الأول ب' },
];
const students = [
  { id: 's1', name: 'أحمد علي', email: 'ahmad@example.com', groupIds: ['c1'] },
  { id: 's2', name: 'سارة محمد', email: 'sara@example.com', groupIds: ['c2'] },
  { id: 's3', name: 'خالد سالم', email: 'khaled@example.com', groupIds: [] },
  { id: 's4', name: 'Mona Test', email: 'MONA@example.com', groupIds: ['school-only'] },
  { id: 's5', name: 'يوسف', email: 'yousef@example.com', groupIds: ['c1'] },
];
const build = (overrides = {}) => buildSchoolRosterViewModel({
  schoolStudents: students,
  schoolClasses: classes,
  search: '',
  classFilter: 'all',
  page: 1,
  pageSize: 2,
  ...overrides,
});

const all = build();
assert.equal(all.visibleSchoolStudents.length, 5);
assert.equal(all.schoolStudentTotalPages, 3);
assert.equal(all.safeSchoolStudentPage, 1);
assert.deepEqual(all.pagedVisibleSchoolStudents.map((student) => student.id), ['s1', 's2']);
assert.equal(all.schoolStudentStartIndex, 0);
assert.equal(all.schoolStudentEndIndex, 2);

assert.deepEqual(
  build({ search: '  AHMAD@EXAMPLE.COM ', pageSize: 10 }).visibleSchoolStudents.map((student) => student.id),
  ['s1'],
  'email search must stay trimmed and case-insensitive',
);
assert.deepEqual(
  build({ search: 'mona', pageSize: 10 }).visibleSchoolStudents.map((student) => student.id),
  ['s4'],
  'name search must stay case-insensitive',
);
assert.deepEqual(
  build({ classFilter: 'c1', pageSize: 10 }).visibleSchoolStudents.map((student) => student.id),
  ['s1', 's5'],
  'specific-class filtering must preserve membership semantics',
);
assert.deepEqual(
  build({ classFilter: 'unassigned', pageSize: 10 }).visibleSchoolStudents.map((student) => student.id),
  ['s3', 's4'],
  'unassigned means no membership in any class belonging to the selected school',
);

const clamped = build({ page: 99, pageSize: 2 });
assert.equal(clamped.safeSchoolStudentPage, 3, 'page above range must clamp to the final page');
assert.deepEqual(clamped.pagedVisibleSchoolStudents.map((student) => student.id), ['s5']);

const empty = build({ search: 'not-found', page: 4 });
assert.equal(empty.visibleSchoolStudents.length, 0);
assert.equal(empty.schoolStudentTotalPages, 1);
assert.equal(empty.safeSchoolStudentPage, 1);
assert.equal(empty.schoolStudentStartIndex, 0);
assert.equal(empty.schoolStudentEndIndex, 0);
assert.deepEqual(empty.pagedVisibleSchoolStudents, []);

const largeClasses = Array.from({ length: 400 }, (_, index) => ({ id: `class-${index}`, name: `Class ${index}` }));
const largeStudents = Array.from({ length: 20000 }, (_, index) => ({
  id: `student-${index}`,
  name: `Student ${index}`,
  email: `student${index}@example.com`,
  groupIds: index % 3 === 0 ? [`class-${index % 400}`] : ['school-only'],
}));
const startedAt = performance.now();
const large = buildSchoolRosterViewModel({
  schoolStudents: largeStudents,
  schoolClasses: largeClasses,
  search: '',
  classFilter: 'unassigned',
  page: 1,
  pageSize: 80,
});
const elapsedMs = performance.now() - startedAt;
assert.equal(large.visibleSchoolStudents.length, 13333, 'large unassigned projection must preserve expected membership result');
assert.equal(large.pagedVisibleSchoolStudents.length, 80);
assert.ok(elapsedMs < 1500, `20k-student roster projection regressed: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  phase: 'schools-roster-viewmodel',
  status: 'PASS',
  managerLines: lineCount(managerSource),
  students: largeStudents.length,
  classes: largeClasses.length,
  elapsedMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
