import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const parentFile = 'dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx';
const childFile = 'dashboards/admin/SchoolsManager/SchoolQuickSupervisorCard.tsx';
const parent = read(parentFile);
const child = read(childFile);

assert.ok(child.includes('export const SchoolQuickSupervisorCard'), 'quick supervisor card must be feature-owned');
assert.ok(!child.includes("from '../SchoolsManager'"), 'quick supervisor card must not import the manager');
assert.ok(!child.includes("from '../../../services/api'"), 'quick supervisor card must not call API directly');
assert.ok(!child.includes("from '../../../store/useStore'"), 'quick supervisor card must not access global store directly');
assert.ok(child.includes("import type { QuickSupervisorDraft } from './contracts';"), 'quick supervisor draft must use the shared feature contract');
for (const testId of [
  'school-relations-quick-supervisor-card',
  'school-relations-supervisor-name',
  'school-relations-supervisor-email',
  'school-relations-supervisor-password',
  'school-relations-supervisor-scope',
  'school-relations-supervisor-submit',
]) {
  assert.ok(child.includes(`data-testid=\"${testId}\"`), `quick supervisor UX contract must preserve ${testId}`);
}
assert.ok(child.includes("<option value=\"\">المدرسة كاملة</option>"), 'school-wide supervisor scope must remain available');
assert.ok(child.includes('schoolClasses.map'), 'class supervisor scope options must remain dynamic');
assert.ok(child.includes('onClick={() => void handleCreateQuickSupervisor()}'), 'create supervisor action must remain explicit');
assert.ok(child.includes('disabled={Boolean(rosterActionPending)}'), 'duplicate roster actions must stay guarded while pending');
assert.ok(lineCount(child) <= 150, `SchoolQuickSupervisorCard must stay <= 150 lines; got ${lineCount(child)}`);

assert.ok(parent.includes("from './SchoolQuickSupervisorCard';"), 'SchoolRelationsPanel must compose quick supervisor child');
assert.ok(parent.includes('<SchoolQuickSupervisorCard'), 'SchoolRelationsPanel must render quick supervisor child');
assert.ok(parent.includes('handleCreateQuickSupervisor={handleCreateQuickSupervisor}'), 'create action wiring must remain explicit in composition');
assert.ok(!parent.includes('school-relations-supervisor-name'), 'quick supervisor input markup must not return to parent');
assert.ok(!parent.includes('schoolClasses.map'), 'scope option rendering must remain in quick supervisor child');
assert.ok(lineCount(parent) <= 150, `SchoolRelationsPanel should remain <= 150 lines after quick supervisor extraction; got ${lineCount(parent)}`);

for (const [file, source] of [[parentFile, parent], [childFile, child]]) {
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
  phase: 'schools-quick-supervisor-boundary',
  status: 'PASS',
  parentLines: lineCount(parent),
  childLines: lineCount(child),
}, null, 2));
