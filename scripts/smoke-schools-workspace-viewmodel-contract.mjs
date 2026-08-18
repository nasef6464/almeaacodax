import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const sourcePath = path.join(root, 'dashboards/admin/SchoolsManager/workspaceViewModel.ts');
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const managerSource = fs.readFileSync(managerPath, 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

assert.ok(source.includes('buildSchoolWorkspaceViewModel'), 'workspace builder must be exported');
assert.ok(!source.includes('useState(') && !source.includes('useMemo('), 'workspace view model must stay React-independent');
assert.ok(!source.includes("from '../../../services/api'"), 'workspace view model must stay API-independent');
assert.ok(lineCount(source) <= 430, 'workspace view model must stay under 430 lines');
assert.ok(managerSource.includes("from './SchoolsManager/workspaceViewModel';"), 'SchoolsManager must delegate workspace decisions');
assert.ok(managerSource.includes('buildSchoolWorkspaceViewModel({'), 'SchoolsManager must call the extracted workspace model');
assert.ok(lineCount(managerSource) <= 4350, `SchoolsManager workspace regression: ${lineCount(managerSource)} lines exceeds 4350`);

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
const diagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(diagnostics.length, 0, 'workspace view model must transpile cleanly');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const { buildSchoolWorkspaceViewModel } = await import(moduleUrl);

const school = {
  id: 'school-1',
  name: 'مدرسة الاختبار',
  type: 'SCHOOL',
  parentId: null,
  ownerId: 'admin',
  supervisorIds: [],
  studentIds: [],
  courseIds: [],
  createdAt: 1,
};
const classroom = {
  id: 'class-1',
  name: 'الأول أ',
  type: 'CLASS',
  parentId: school.id,
  ownerId: 'admin',
  supervisorIds: ['sup-1'],
  studentIds: ['student-1'],
  courseIds: [],
  createdAt: 1,
};
const student = { id: 'student-1', name: 'طالب', email: 'student@example.com', groupIds: ['class-1'] };
const supervisor = { id: 'sup-1', name: 'مشرف', email: 'sup@example.com', groupIds: ['class-1'] };
const activePackage = { id: 'pkg-1', schoolId: school.id, status: 'active', maxStudents: 50 };
const activeCode = { id: 'code-1', schoolId: school.id, packageId: 'pkg-1', currentUses: 10, maxUses: 50, expiresAt: Date.now() + 86400000 };
const report = {
  school: { id: school.id, name: school.name },
  metrics: { totalStudents: 1, activeStudents: 1, totalClasses: 1, activePackages: 1, activeCodes: 1, quizAttempts: 4, averageScore: 82 },
  classSummaries: [],
  weakestSkills: [],
};

const baseInput = {
  school,
  schoolClasses: [],
  schoolStudents: [],
  schoolSupervisors: [],
  studentsWithoutClass: [],
  studentsWithoutParent: [],
  activeSchoolPackages: [],
  activeSchoolCodes: [],
  totalSeats: 0,
  usedSeats: 0,
  schoolReport: null,
  saveVerificationState: 'idle',
  schoolActionPending: null,
  rosterActionPending: null,
  packageActionPending: null,
  accessCodeActionPending: null,
  isImporting: false,
  isApplyingRelations: false,
};

const empty = buildSchoolWorkspaceViewModel(baseInput);
assert.equal(empty.readinessScore, 0, 'empty school readiness score must remain zero');
assert.equal(empty.readinessStatusLabel, 'تحتاج تجهيز');
assert.equal(empty.handoverBlockingGaps.length, 5, 'all five operational checks must block empty school handover');
assert.equal(empty.nextOperatingStep.id, 'classes', 'classes must remain the first missing operating step');
assert.equal(empty.commercialDecisionCards.at(-1).target, 'school-classes-panel');
assert.match(empty.schoolHandoverMessage, /مدرسة الاختبار/);
assert.equal(empty.isSchoolWorkspaceBusy, false);
assert.equal(empty.saveVerificationButtonLabel, 'حفظ وتأكيد البيانات');

const ready = buildSchoolWorkspaceViewModel({
  ...baseInput,
  schoolClasses: [classroom],
  schoolStudents: [student],
  schoolSupervisors: [supervisor],
  activeSchoolPackages: [activePackage],
  activeSchoolCodes: [activeCode],
  totalSeats: 50,
  usedSeats: 10,
  schoolReport: report,
});
assert.equal(ready.readinessScore, 5, 'fully configured school must retain 5/5 readiness');
assert.equal(ready.readinessStatusLabel, 'جاهزة للتسليم');
assert.equal(ready.handoverBlockingGaps.length, 0);
assert.equal(ready.readinessPercent, 100);
assert.equal(ready.handoverDecisionTitle, 'جاهزة للتسليم التجاري');
assert.equal(ready.operationalWarnings.length, 0);
assert.equal(ready.commercialOperatingSteps.every((step) => step.isReady), true);
assert.equal(ready.nextOperatingStep.id, 'reports', 'when all steps are ready the final reports step remains the display fallback');
assert.match(ready.schoolHandoverMessage, /5\/5/);

const gaps = buildSchoolWorkspaceViewModel({
  ...baseInput,
  schoolClasses: [classroom],
  schoolStudents: [student],
  schoolSupervisors: [supervisor],
  studentsWithoutClass: [student],
  studentsWithoutParent: [student],
  activeSchoolPackages: [activePackage],
  activeSchoolCodes: [activeCode],
  totalSeats: 10,
  usedSeats: 10,
});
assert.equal(gaps.readinessChecks.find((check) => check.label === 'طلاب مسجلون').isReady, false);
assert.ok(gaps.operationalWarnings.includes('تم استهلاك كل المقاعد المتاحة، راجع سعة الباقات.'));
assert.ok(gaps.operationalWarnings.includes('يوجد طلاب بلا فصل، يفضل نقلهم لفصول قبل متابعة التقارير.'));
assert.ok(gaps.operationalWarnings.includes('يوجد طلاب بلا ولي أمر مرتبط، راجع تبويب الربط والمتابعة قبل تسليم الحسابات.'));
assert.equal(gaps.overviewFocusActions.find((item) => item.id === 'students').tone, 'amber');

for (const [state, expected] of [
  ['saving', 'جاري الحفظ...'],
  ['verifying', 'جاري التحقق...'],
  ['success', 'تم الحفظ والتأكد'],
  ['error', 'فشل الحفظ'],
]) {
  const model = buildSchoolWorkspaceViewModel({ ...baseInput, saveVerificationState: state });
  assert.equal(model.saveVerificationButtonLabel, expected);
  assert.equal(model.isSaveVerificationBusy, state === 'saving' || state === 'verifying');
}
assert.equal(buildSchoolWorkspaceViewModel({ ...baseInput, packageActionPending: 'save' }).isSchoolWorkspaceBusy, true);
assert.equal(buildSchoolWorkspaceViewModel({ ...baseInput, isImporting: true }).isSchoolWorkspaceBusy, true);

const startedAt = performance.now();
for (let index = 0; index < 10000; index += 1) {
  buildSchoolWorkspaceViewModel({
    ...baseInput,
    schoolClasses: [classroom],
    schoolStudents: [student],
    schoolSupervisors: [supervisor],
    activeSchoolPackages: [activePackage],
    activeSchoolCodes: [activeCode],
    totalSeats: 50,
    usedSeats: index % 50,
    schoolReport: report,
  });
}
const elapsedMs = performance.now() - startedAt;
assert.ok(elapsedMs < 2500, `10k workspace calculations regressed: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  phase: 'schools-workspace-viewmodel',
  status: 'PASS',
  managerLines: lineCount(managerSource),
  readinessChecks: ready.readinessChecks.length,
  iterations: 10000,
  elapsedMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
