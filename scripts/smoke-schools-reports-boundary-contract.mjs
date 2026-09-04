import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const reportsFile = 'dashboards/admin/SchoolsManager/SchoolReportsPanel.tsx';
const handoverFile = 'dashboards/admin/SchoolsManager/SchoolHandoverReportSummary.tsx';
const performanceFile = 'dashboards/admin/SchoolsManager/SchoolPerformanceReportPanel.tsx';
const contentRoutesFile = 'server/src/routes/content.routes.ts';
const manager = read(managerFile);
const reports = read(reportsFile);
const handover = read(handoverFile);
const performance = read(performanceFile);
const contentRoutes = read(contentRoutesFile);

assert.ok(manager.includes("from './SchoolsManager/SchoolReportsPanel';"), 'SchoolsManager must compose the school reports feature panel');
assert.ok(manager.includes('<SchoolReportsPanel'), 'SchoolsManager must render SchoolReportsPanel');
assert.ok(!manager.includes('<div data-testid="school-handover-report-summary"'), 'handover report markup must leave the manager');
assert.ok(!manager.includes('<h3 className="text-lg font-bold text-gray-900">ملف تقرير المدرسة</h3>'), 'performance report markup must leave the manager');
assert.ok(lineCount(manager) <= 4120, `SchoolsManager reports extraction regression: ${lineCount(manager)} lines exceeds 4120.`);

assert.ok(reports.includes('export const SchoolReportsPanel'), 'school reports panel must be feature-owned');
assert.ok(reports.includes('<SchoolHandoverReportSummary'), 'reports panel must compose handover summary');
assert.ok(reports.includes('<SchoolPerformanceReportPanel'), 'reports panel must compose performance report');
assert.ok(!reports.includes("from '../../../services/api'"), 'reports presentation must not call API directly');
assert.ok(!reports.includes("from '../../../store/useStore'"), 'reports presentation must not own global store');
assert.ok(lineCount(reports) <= 120, `SchoolReportsPanel must stay <= 120 lines; got ${lineCount(reports)}`);

for (const contract of [
  ['قرار تسليم المدرسة', handover],
  ['school-report-download-handover', handover],
  ['school-report-download-gaps', handover],
  ['school-report-print-readiness', handover],
  ['school-handover-blocking-gaps', handover],
  ['onNavigateTab(gap.tab)', handover],
]) {
  assert.ok(contract[1].includes(contract[0]), `handover report contract must preserve ${contract[0]}`);
}
assert.ok(!handover.includes("from '../../../services/api'"), 'handover child must be presentation-only');
assert.ok(!handover.includes("from '../../../store/useStore'"), 'handover child must not access global store');
assert.ok(lineCount(handover) <= 220, `SchoolHandoverReportSummary must stay <= 220 lines; got ${lineCount(handover)}`);

for (const contract of [
  'جارٍ تحميل تقرير المدرسة...',
  'لا توجد بيانات تقرير متاحة بعد.',
  'ملف تقرير المدرسة',
  'تصدير تقرير المدرسة',
  'الطلاب النشطون',
  'محاولات الاختبار',
  'متوسط الأداء',
  'الأكواد النشطة',
  'أضعف المهارات داخل المدرسة',
  'أداء الفصول',
]) {
  assert.ok(performance.includes(contract), `performance report contract must preserve ${contract}`);
}
assert.ok(performance.includes('subjects.find'), 'weak skill subject lookup must remain intact');
assert.ok(performance.includes('sections.find'), 'weak skill section lookup must remain intact');
assert.ok(performance.includes('Math.min(classroom.averageScore, 100)'), 'class progress width must stay bounded');
assert.ok(!performance.includes("from '../../../services/api'"), 'performance child must be presentation-only');
assert.ok(!performance.includes("from '../../../store/useStore'"), 'performance child must not access global store');
assert.ok(lineCount(performance) <= 220, `SchoolPerformanceReportPanel must stay <= 220 lines; got ${lineCount(performance)}`);

for (const contract of [
  'const quizResultFilter = { userId: { $in: studentIds } };',
  'QuizResultModel.aggregate([',
  'averageScore: { $avg: "$score" }',
  'scoreTotal: { $sum: "$score" }',
  'masteryTotal: { $sum: "$skillsAnalysis.mastery" }',
  'sampledQuizAttempts: quizResults.length',
]) {
  assert.ok(contentRoutes.includes(contract), `school report must preserve aggregate-backed ${contract}`);
}
assert.ok(contentRoutes.includes('const classAttempts = classResults.reduce'), 'class summaries must use complete aggregate stats, not paginated samples');

for (const [file, source] of [
  [reportsFile, reports],
  [handoverFile, handover],
  [performanceFile, performance],
]) {
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
  phase: 'schools-reports-presentation-boundary',
  status: 'PASS',
  managerLines: lineCount(manager),
  reportsLines: lineCount(reports),
  handoverLines: lineCount(handover),
  performanceLines: lineCount(performance),
}, null, 2));
