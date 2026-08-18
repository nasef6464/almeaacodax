import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lines = (source) => source.split(/\r?\n/).length;

const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const viewModelFile = 'dashboards/admin/SchoolsManager/readinessViewModel.ts';
const managerSource = read(managerFile);
const viewModelSource = read(viewModelFile);

assert.ok(
  managerSource.includes("from './SchoolsManager/readinessViewModel';"),
  'SchoolsManager must delegate readiness calculations to the feature-owned view model.',
);
assert.ok(!managerSource.includes('const getStudentsForSchool = (school: Group'), 'Student membership selector must leave the God Component.');
assert.ok(!managerSource.includes('const getSchoolOperationalSnapshot = (school: Group)'), 'Operational snapshot calculation must leave the God Component.');
assert.ok(!managerSource.includes('const schoolPortfolioRows = useMemo(() => schools.map((school) => {'), 'Portfolio mapping must leave the God Component.');
assert.ok(lines(viewModelSource) <= 280, `readinessViewModel.ts exceeded the 280-line phase budget (${lines(viewModelSource)} lines).`);
assert.ok(!viewModelSource.includes('useState(') && !viewModelSource.includes('useMemo('), 'Readiness view model must remain React-independent.');
assert.ok(!viewModelSource.includes('Date.now()') || viewModelSource.includes('context.now ?? Date.now()'), 'Current time must be injectable for deterministic tests.');

const transpiled = ts.transpileModule(viewModelSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
const errors = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(errors.length, 0, 'Readiness view model must transpile without TypeScript diagnostics.');
const viewModel = await import(`data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`);

const school = {
  id: 'school-1',
  name: 'مدرسة الإنتاج',
  type: 'SCHOOL',
  supervisorIds: [],
  studentIds: [],
};
const classroom = {
  id: 'class-1',
  name: 'الفصل أ',
  type: 'CLASS',
  parentId: school.id,
  supervisorIds: [],
  studentIds: ['student-via-class-list'],
};
const students = [
  { id: 'student-via-school-id', schoolId: school.id, groupIds: [] },
  { id: 'student-via-class-group', groupIds: [classroom.id] },
  { id: 'student-via-class-list', groupIds: [] },
  { id: 'student-via-school-group', groupIds: [school.id] },
  { id: 'student-unrelated', schoolId: 'school-2', groupIds: ['class-2'] },
];

assert.deepEqual(
  viewModel.getStudentsForSchool(school, [classroom], students).map((item) => item.id),
  [
    'student-via-school-id',
    'student-via-class-group',
    'student-via-class-list',
    'student-via-school-group',
  ],
  'School roster must preserve all existing relationship paths without duplicating unrelated students.',
);

const now = 10_000;
const context = {
  classes: [classroom],
  students,
  b2bPackages: [
    { id: 'pkg-active', schoolId: school.id, status: 'active' },
    { id: 'pkg-expired', schoolId: school.id, status: 'expired' },
  ],
  accessCodes: [
    { id: 'code-active', schoolId: school.id, expiresAt: now + 1 },
    { id: 'code-expired', schoolId: school.id, expiresAt: now },
  ],
  now,
};
const snapshot = viewModel.getSchoolOperationalSnapshot(school, context);
assert.equal(snapshot.schoolClasses.length, 1);
assert.equal(snapshot.schoolStudents.length, 4);
assert.equal(snapshot.activePackageCount, 1);
assert.equal(snapshot.activeCodeCount, 1);
assert.equal(snapshot.readinessScore, 4, 'Missing supervisor must remain the only failing readiness dimension.');
assert.equal(snapshot.isCommerciallyHiddenDraft, false);

const emptyDraft = viewModel.getSchoolOperationalSnapshot(
  { id: 'draft', name: 'مدرسة جديدة - 1', type: 'SCHOOL', supervisorIds: [], studentIds: [] },
  { classes: [], students: [], b2bPackages: [], accessCodes: [], now },
);
assert.equal(emptyDraft.isEmptyDraft, true);
assert.equal(emptyDraft.isCommerciallyHiddenDraft, true);

const lowReadinessDemo = viewModel.getSchoolOperationalSnapshot(
  { id: 'demo', name: 'Demo School', type: 'SCHOOL', supervisorIds: ['supervisor-1'], studentIds: [] },
  { classes: [], students: [], b2bPackages: [], accessCodes: [], now },
);
assert.equal(lowReadinessDemo.readinessScore, 1);
assert.equal(lowReadinessDemo.isCommerciallyHiddenDraft, true, 'Low-readiness demo school without students must remain commercially hidden.');

const readySchool = { ...school, supervisorIds: ['supervisor-1'] };
const readySnapshot = viewModel.getSchoolOperationalSnapshot(readySchool, context);
assert.equal(readySnapshot.readinessScore, 5);
const readyChecks = viewModel.buildSchoolReadinessChecks(readySchool, readySnapshot);
assert.equal(readyChecks.every((check) => check.isReady), true);

const rows = viewModel.buildSchoolPortfolioRows([school, readySchool], context);
assert.equal(rows[0].status, 'قريبة من التسليم');
assert.equal(rows[0].nextAction?.key, 'supervisors');
assert.equal(rows[1].status, 'جاهزة للبيع/التسليم');
assert.equal(rows[1].nextAction, undefined);

const summary = viewModel.summarizeSchoolPortfolio(rows);
assert.equal(summary.ready, 1);
assert.equal(summary.nearReady, 1);
assert.equal(summary.needsSetup, 0);
assert.equal(summary.totalStudents, 8);
assert.equal(summary.totalActivePackages, 2);
assert.equal(summary.nextPriority?.school.id, school.id, 'Lowest readiness score must remain first follow-up priority.');

console.log(JSON.stringify({
  phase: 'schools-readiness-viewmodel',
  status: 'PASS',
  viewModelLines: lines(viewModelSource),
  relationshipPathsCovered: 4,
  readinessDimensions: readyChecks.length,
}, null, 2));
