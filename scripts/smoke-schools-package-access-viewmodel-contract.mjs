import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager/packageAccessViewModel.ts'), 'utf8');
const panelSource = fs.readFileSync(path.join(root, 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx'), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

assert.ok(source.includes('buildSchoolPackageAccessViewModel'), 'package access builder must be exported');
assert.ok(source.includes('new Map(publishedCourses.map'), 'course lookups must be indexed');
assert.ok(source.includes('new Map(paths.map'), 'path lookups must be indexed');
assert.ok(source.includes('new Map(subjects.map'), 'subject lookups must be indexed');
assert.ok(source.includes('new Map(teachers.map'), 'teacher lookups must be indexed');
assert.ok(!source.includes('useMemo(') && !source.includes('useState('), 'package access view model must stay React-independent');
assert.ok(!source.includes("from '../../../services/api'"), 'package access view model must stay API-independent');
assert.ok(lineCount(source) <= 170, 'package access view model must stay <= 170 lines');
assert.ok(panelSource.includes("from './packageAccessViewModel';"), 'SchoolPackagesPanel must delegate package access projection');
assert.ok(panelSource.includes('buildSchoolPackageAccessViewModel({'), 'SchoolPackagesPanel must call the extracted package access view model');
assert.ok(panelSource.includes('packageAccessRowsById.get(pkg.id)'), 'package cards must use indexed presentation rows');
for (const staleScan of [
  'const packageCourses = publishedCourses.filter',
  'const packagePaths = paths.filter',
  'const packageSubjects = subjects.filter',
  'const packageTeacher = teachers.find',
]) {
  assert.ok(!panelSource.includes(staleScan), `per-package collection scan must not return: ${staleScan}`);
}

const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'package access view model must transpile cleanly');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const { buildSchoolPackageAccessViewModel } = await import(moduleUrl);

const courses = [
  { id: 'course-1', title: 'Course 1' },
  { id: 'course-2', title: 'Course 2' },
];
const paths = [
  { id: 'path-1', name: 'Path 1' },
  { id: 'path-2', name: 'Path 2' },
];
const subjects = [
  { id: 'subject-1', name: 'Subject 1' },
  { id: 'subject-2', name: 'Subject 2' },
];
const teachers = [
  { id: 'teacher-1', name: 'Teacher 1' },
  { id: 'teacher-2', name: 'Teacher 2' },
];
const pkg = {
  id: 'pkg-1',
  courseIds: ['course-2', 'missing-course', 'course-1'],
  pathIds: ['path-2'],
  subjectIds: ['subject-1', 'missing-subject'],
  assignedTeacherId: 'teacher-2',
  status: 'active',
};
const activeCode = { id: 'code-1', expiresAt: Date.now() + 60_000 };
const build = (overrides = {}) => buildSchoolPackageAccessViewModel({
  schoolPackages: [pkg],
  activeSchoolPackages: [pkg],
  schoolCodes: [activeCode],
  activeSchoolCodes: [activeCode],
  totalSeats: 100,
  usedSeats: 25,
  publishedCourses: courses,
  paths,
  subjects,
  teachers,
  ...overrides,
});

const ready = build();
assert.equal(ready.activePackageCount, 1);
assert.equal(ready.inactivePackageCount, 0);
assert.equal(ready.activeCodeCount, 1);
assert.equal(ready.totalCodeCount, 1);
assert.equal(ready.seatUsagePercent, 25);
assert.equal(ready.seatsLabel, '25/100');
assert.equal(ready.seatCapacityExhausted, false);
assert.equal(ready.accessReady, true);
assert.equal(ready.accessStatusLabel, 'الوصول جاهز للتسليم');
assert.match(ready.accessNextAction, /جاهزة/);
const presentation = ready.packageAccessRowsById.get('pkg-1');
assert.deepEqual(presentation.courses.map((course) => course.id), ['course-2', 'course-1'], 'package course order must follow package IDs and ignore missing references');
assert.deepEqual(presentation.paths.map((item) => item.id), ['path-2']);
assert.deepEqual(presentation.subjects.map((item) => item.id), ['subject-1']);
assert.equal(presentation.teacher.id, 'teacher-2');

const noPackage = build({ activeSchoolPackages: [], activeSchoolCodes: [] });
assert.equal(noPackage.accessReady, false);
assert.equal(noPackage.activePackageCount, 0);
assert.match(noPackage.accessNextAction, /فعّل باقة/);

const noCode = build({ activeSchoolCodes: [] });
assert.equal(noCode.accessReady, false);
assert.match(noCode.accessNextAction, /ولّد كود/);

const exhausted = build({ usedSeats: 100 });
assert.equal(exhausted.seatCapacityExhausted, true);
assert.equal(exhausted.seatUsagePercent, 100);
assert.equal(exhausted.accessReady, false);
assert.match(exhausted.accessNextAction, /مستهلكة بالكامل/);

const overUsed = build({ usedSeats: 150 });
assert.equal(overUsed.seatUsagePercent, 100, 'seat percentage must remain capped at 100%');
assert.equal(overUsed.seatsLabel, '150/100', 'seat label must preserve raw operational counts');

const noCapacity = build({ totalSeats: 0, usedSeats: 12 });
assert.equal(noCapacity.hasSeatCapacity, false);
assert.equal(noCapacity.seatUsagePercent, 0);
assert.equal(noCapacity.seatsLabel, '0/0');

const inactivePackage = { ...pkg, id: 'pkg-2', status: 'expired' };
const mixed = build({ schoolPackages: [pkg, inactivePackage] });
assert.equal(mixed.inactivePackageCount, 1);

const largeCourses = Array.from({ length: 2000 }, (_, index) => ({ id: `course-${index}`, title: `Course ${index}` }));
const largePaths = Array.from({ length: 800 }, (_, index) => ({ id: `path-${index}`, name: `Path ${index}` }));
const largeSubjects = Array.from({ length: 1200 }, (_, index) => ({ id: `subject-${index}`, name: `Subject ${index}` }));
const largeTeachers = Array.from({ length: 500 }, (_, index) => ({ id: `teacher-${index}`, name: `Teacher ${index}` }));
const largePackages = Array.from({ length: 5000 }, (_, index) => ({
  id: `pkg-${index}`,
  status: index % 4 === 0 ? 'expired' : 'active',
  courseIds: [`course-${index % 2000}`, `course-${(index + 17) % 2000}`],
  pathIds: [`path-${index % 800}`],
  subjectIds: [`subject-${index % 1200}`, `subject-${(index + 5) % 1200}`],
  assignedTeacherId: `teacher-${index % 500}`,
}));
const largeActive = largePackages.filter((item) => item.status === 'active');
const startedAt = performance.now();
const large = buildSchoolPackageAccessViewModel({
  schoolPackages: largePackages,
  activeSchoolPackages: largeActive,
  schoolCodes: [],
  activeSchoolCodes: [],
  totalSeats: 10000,
  usedSeats: 4200,
  publishedCourses: largeCourses,
  paths: largePaths,
  subjects: largeSubjects,
  teachers: largeTeachers,
});
const elapsedMs = performance.now() - startedAt;
assert.equal(large.packageAccessRowsById.size, 5000);
assert.equal(large.inactivePackageCount, 1250);
assert.ok(elapsedMs < 1500, `5k-package indexed projection regressed: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  phase: 'schools-package-access-viewmodel',
  status: 'PASS',
  packages: largePackages.length,
  courses: largeCourses.length,
  paths: largePaths.length,
  subjects: largeSubjects.length,
  teachers: largeTeachers.length,
  elapsedMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
