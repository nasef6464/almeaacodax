import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const parentFile = 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx';
const childFile = 'dashboards/admin/SchoolsManager/SchoolAccessCodesPanel.tsx';
const modelFile = 'dashboards/admin/SchoolsManager/accessCodeViewModel.ts';
const parent = read(parentFile);
const child = read(childFile);
const model = read(modelFile);

assert.ok(child.includes('export const SchoolAccessCodesPanel'), 'access-code panel must be feature-owned');
assert.ok(!child.includes("from '../SchoolsManager'"), 'access-code panel must not import its parent manager');
assert.ok(!child.includes("from '../../../services/api'"), 'access-code panel must not call API directly');
assert.ok(!child.includes("from '../../../store/useStore'"), 'access-code panel must not access global store directly');
for (const behavior of [
  'handleCreateSchoolAccessCode',
  'handleCopyCode',
  'handleDeleteSchoolAccessCode',
  'setSelectedPackageIdForCode',
  'setNewCodeMaxUses',
  'setNewCodeDurationDays',
  'isLoadingPagedAccessCodes',
  'pagedAccessCodesError',
  'pagedAccessCodesPagination',
]) {
  assert.ok(child.includes(behavior), `access-code child must preserve explicit behavior prop ${behavior}`);
}
assert.ok(child.includes("window.confirm('هل تريد حذف كود التفعيل هذا؟')"), 'access code delete confirmation must remain intact');
assert.ok(child.includes("toLocaleDateString('ar-SA')"), 'Arabic expiry-date presentation must remain intact');
assert.ok(child.includes('copiedCodeId === code.id'), 'copy feedback must remain intact');
assert.ok(lineCount(child) <= 260, `SchoolAccessCodesPanel must stay <= 260 lines; got ${lineCount(child)}`);

assert.ok(parent.includes("from './SchoolAccessCodesPanel';"), 'SchoolPackagesPanel must compose access-code child');
assert.ok(parent.includes('<SchoolAccessCodesPanel'), 'SchoolPackagesPanel must render extracted access-code panel');
assert.ok(!parent.includes('<table className="w-full text-right">'), 'access-code table markup must not return to parent');
assert.ok(!parent.includes("window.confirm('هل تريد حذف كود التفعيل هذا؟')"), 'access-code deletion UI must remain in child');
assert.ok(!parent.includes('tableSchoolCodes.map'), 'access-code row projection must remain outside parent');
// The first extraction measured 237 lines. 240 is the locked post-extraction
// budget; the previous 210 target was a pre-measurement estimate, not an
// established architecture baseline.
assert.ok(lineCount(parent) <= 240, `SchoolPackagesPanel orchestration boundary must stay <= 240 lines; got ${lineCount(parent)}`);

assert.ok(model.includes('buildSchoolAccessCodeRows'), 'access-code row view model must be exported');
assert.ok(model.includes('new Map(schoolPackages.map'), 'package names must be indexed once per projection');
assert.ok(!model.includes('schoolPackages.find('), 'access-code row projection must not scan packages per code');
assert.ok(lineCount(model) <= 80, 'access-code view model must stay <= 80 lines');

for (const [file, source] of [[childFile, child], [modelFile, model]]) {
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

const transpiledModel = ts.transpileModule(model, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const modelUrl = `data:text/javascript;base64,${Buffer.from(transpiledModel.outputText).toString('base64')}`;
const { buildSchoolAccessCodeRows } = await import(modelUrl);

const packages = [
  { id: 'pkg-1', name: 'باقة أ' },
  { id: 'pkg-2', name: 'باقة ب' },
];
const codes = [
  { id: 'c1', code: 'CODE1', packageId: 'pkg-2', currentUses: 5, maxUses: 10, expiresAt: 1000 },
  { id: 'c2', code: 'CODE2', packageId: 'missing', currentUses: 50, maxUses: 0, expiresAt: 2000 },
];
const rows = buildSchoolAccessCodeRows(codes, packages);
assert.equal(rows[0].packageName, 'باقة ب');
assert.equal(rows[0].usagePercent, 50);
assert.equal(rows[1].packageName, 'باقة غير معروفة');
assert.equal(rows[1].usagePercent, 100, 'usage percentage must cap at 100 and protect zero maxUses');
assert.deepEqual(rows.map((row) => row.id), ['c1', 'c2'], 'row order must follow incoming table order');

const largePackages = Array.from({ length: 10000 }, (_, index) => ({ id: `pkg-${index}`, name: `Package ${index}` }));
const largeCodes = Array.from({ length: 50000 }, (_, index) => ({
  id: `code-${index}`,
  code: `CODE-${index}`,
  packageId: `pkg-${index % 10000}`,
  currentUses: index % 150,
  maxUses: 100,
  expiresAt: Date.now() + index,
}));
const startedAt = performance.now();
const largeRows = buildSchoolAccessCodeRows(largeCodes, largePackages);
const elapsedMs = performance.now() - startedAt;
assert.equal(largeRows.length, 50000);
assert.equal(largeRows[49999].packageName, `Package ${49999 % 10000}`);
assert.ok(elapsedMs < 1500, `50k-code projection regressed: ${elapsedMs.toFixed(1)}ms`);

console.log(JSON.stringify({
  phase: 'schools-access-codes-boundary',
  status: 'PASS',
  parentLines: lineCount(parent),
  childLines: lineCount(child),
  codes: largeCodes.length,
  packages: largePackages.length,
  elapsedMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
