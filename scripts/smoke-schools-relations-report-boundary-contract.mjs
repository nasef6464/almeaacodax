import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const parentFile = 'dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx';
const reportFile = 'dashboards/admin/SchoolsManager/SchoolRelationsReportPanel.tsx';
const parent = read(parentFile);
const report = read(reportFile);

assert.ok(report.includes('export const SchoolRelationsReportPanel'), 'school report panel must be feature-owned');
assert.ok(!report.includes("from '../SchoolsManager'"), 'school report child must not import the parent manager');
assert.ok(!report.includes("from '../../../services/api'"), 'school report child must not call API directly');
assert.ok(!report.includes("from '../../../store/useStore'"), 'school report child must not access global store directly');
assert.ok(report.includes('تقرير المتابعة المدرسية'), 'school report heading must remain visible');
assert.ok(report.includes('downloadRelationsReport'), 'school report action must stay explicit');
assert.ok(report.includes('onClick={downloadRelationsReport}'), 'school report download button must remain wired');
assert.ok(report.includes('studentsWithoutParent.slice(0, 5)'), 'missing-parent preview must remain capped at five rows');
assert.ok(report.includes('studentsWithoutClass.slice(0, 5)'), 'missing-class preview must remain capped at five rows');
assert.ok(report.includes('وضع الربط الأساسي جيد'), 'healthy relationship state must remain visible');
assert.ok(lineCount(report) <= 120, `SchoolRelationsReportPanel must stay <= 120 lines; got ${lineCount(report)}`);

assert.ok(parent.includes("from './SchoolRelationsReportPanel';"), 'SchoolRelationsPanel must compose the report child');
assert.ok(parent.includes('<SchoolRelationsReportPanel'), 'SchoolRelationsPanel must render the report child');
assert.ok(!parent.includes('<h3 className="text-lg font-black text-gray-900">تقرير المتابعة المدرسية</h3>'), 'report markup must not return to parent');
assert.ok(!parent.includes('studentsWithoutParent.slice(0, 5)'), 'missing-parent report preview must remain in report child');
assert.ok(!parent.includes('studentsWithoutClass.slice(0, 5)'), 'missing-class report preview must remain in report child');
assert.ok(parent.includes('downloadRelationsReport={downloadRelationsReport}'), 'parent must pass report action explicitly');
assert.ok(lineCount(parent) <= 250, `SchoolRelationsPanel should remain <= 250 lines after report extraction; got ${lineCount(parent)}`);

for (const [file, source] of [[parentFile, parent], [reportFile, report]]) {
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
  phase: 'schools-relations-report-boundary',
  status: 'PASS',
  parentLines: lineCount(parent),
  reportLines: lineCount(report),
}, null, 2));
