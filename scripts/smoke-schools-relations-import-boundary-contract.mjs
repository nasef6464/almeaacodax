import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const parentFile = 'dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx';
const childFile = 'dashboards/admin/SchoolsManager/SchoolRelationsImportPanel.tsx';
const parent = read(parentFile);
const child = read(childFile);

assert.ok(child.includes('export const SchoolRelationsImportPanel'), 'relation import panel must be feature-owned');
assert.ok(!child.includes("from '../SchoolsManager'"), 'relation import child must not import the parent manager');
assert.ok(!child.includes("from '../../../services/api'"), 'relation import child must not call API directly');
assert.ok(!child.includes("from '../../../store/useStore'"), 'relation import child must not access global store directly');
for (const behavior of [
  'downloadRelationsTemplate',
  'handleRelationFile',
  'createMissingRelationUsers',
  'setCreateMissingRelationUsers',
  'handleApplyRelationImport',
  'downloadRelationCredentials',
]) {
  assert.ok(child.includes(behavior), `relation import child must keep explicit behavior ${behavior}`);
}
assert.ok(child.includes('accept=".xlsx,.xls,.csv,.tsv,.txt"'), 'accepted relation file types must remain unchanged');
assert.ok(child.includes('relationRows.slice(0, 6)'), 'preview must remain capped at six rows');
assert.ok(child.includes('<Upload size={28} />'), 'relation upload affordance must stay inside the import child');
assert.ok(!child.includes('تقرير المتابعة المدرسية'), 'school report presentation must not leak into the relation-import child');
assert.ok(!child.includes('downloadSchoolReport'), 'school report actions must remain outside the relation-import child');
for (const field of [
  'createdParents',
  'createdSupervisors',
  'linkedParents',
  'linkedSupervisors',
  'assignedClasses',
  'missingStudents',
  'missingParents',
  'missingSupervisors',
]) {
  assert.ok(child.includes(`relationSummary.${field}`), `relation result metric must remain visible: ${field}`);
}
assert.ok(lineCount(child) <= 260, `SchoolRelationsImportPanel must stay <= 260 lines; got ${lineCount(child)}`);

assert.ok(parent.includes("from './SchoolRelationsImportPanel';"), 'SchoolRelationsPanel must compose the import child');
assert.ok(parent.includes('<SchoolRelationsImportPanel'), 'SchoolRelationsPanel must render relation import child');
assert.ok(!parent.includes('relationRows.slice(0, 6)'), 'relation preview markup must not return to parent');
assert.ok(!parent.includes('تم تجهيز {relationRows.length} صف للربط'), 'relation import execution UI must remain in child');
assert.ok(!parent.includes('relationSummary.createdParents'), 'relation import results must remain in child');
assert.ok(!parent.includes('<Upload size={28} />'), 'relation upload markup must remain owned by the import child');
assert.ok(parent.includes('تقرير المتابعة المدرسية'), 'school report section must remain owned by the parent until its own boundary extraction');
assert.ok(parent.includes('downloadSchoolReport'), 'school report action wiring must remain intact in the parent');
assert.ok(lineCount(parent) <= 280, `SchoolRelationsPanel should shrink below 280 lines; got ${lineCount(parent)}`);

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
  phase: 'schools-relations-import-boundary',
  status: 'PASS',
  parentLines: lineCount(parent),
  childLines: lineCount(child),
}, null, 2));
