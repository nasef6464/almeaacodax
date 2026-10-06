import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const parentFile = 'dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx';
const statusFile = 'dashboards/admin/SchoolsManager/SchoolRelationsStatusPanel.tsx';
const parent = read(parentFile);
const status = read(statusFile);

assert.ok(status.includes('export const SchoolRelationsStatusPanel'), 'relations status panel must be feature-owned');
assert.ok(!status.includes("from '../SchoolsManager'"), 'status child must not import the manager');
assert.ok(!status.includes("from '../../../services/api'"), 'status child must remain presentation-only');
assert.ok(!status.includes("from '../../../store/useStore'"), 'status child must not own global state');
assert.ok(status.includes('schoolLevelSupervisors.length > 0'), 'handover readiness must still require a school-level supervisor');
assert.ok(status.includes('studentsWithoutClass.length === 0'), 'handover readiness must still account for missing classes');
assert.ok(status.includes('studentsWithoutParent.length === 0'), 'handover readiness must still account for missing parents');
for (const label of [
  'قرار المشرفين قبل التسليم',
  'مدير/مشرف عام',
  'مشرفو الفصول',
  'نواقص التسليم',
  'أولياء أمور مرتبطون',
  'طلاب بلا ولي أمر',
  'طلاب بلا فصل',
  'مشرفون ومعلمون',
]) {
  assert.ok(status.includes(label), `relations status must preserve visible label: ${label}`);
}
assert.ok(lineCount(status) <= 180, `SchoolRelationsStatusPanel must stay <= 180 lines; got ${lineCount(status)}`);

assert.ok(parent.includes("from './SchoolRelationsStatusPanel';"), 'SchoolRelationsPanel must compose status child');
assert.ok(parent.includes('<SchoolRelationsStatusPanel'), 'SchoolRelationsPanel must render status child');
assert.ok(!parent.includes('قرار المشرفين قبل التسليم'), 'status markup must not return to composition parent');
assert.ok(!parent.includes('schoolLevelSupervisors.length > 0 &&'), 'readiness presentation calculation must remain in status child');
assert.ok(lineCount(parent) <= 150, `SchoolRelationsPanel should remain <= 150 lines after status extraction; got ${lineCount(parent)}`);

for (const [file, source] of [[parentFile, parent], [statusFile, status]]) {
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
  phase: 'schools-relations-status-boundary',
  status: 'PASS',
  parentLines: lineCount(parent),
  statusLines: lineCount(status),
}, null, 2));
