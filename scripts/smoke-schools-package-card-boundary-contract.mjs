import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const panelFile = 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx';
const cardFile = 'dashboards/admin/SchoolsManager/SchoolPackageCard.tsx';
const panel = read(panelFile);
const card = read(cardFile);

assert.ok(card.includes('export const SchoolPackageCard'), 'package card must expose a feature-owned presentation component');
assert.ok(!card.includes("from '../SchoolsManager'"), 'package card must never import the parent manager');
assert.ok(!card.includes("from '../../../services/api'"), 'package card must not call API directly');
assert.ok(!card.includes("from '../../../store/useStore'"), 'package card must not access global store directly');
assert.ok(card.includes('handleUpdateSchoolPackage'), 'package card must receive update behavior explicitly');
assert.ok(card.includes('handleDeleteSchoolPackage'), 'package card must receive delete behavior explicitly');
assert.ok(card.includes('assignCourseToGroup'), 'package card must receive course assignment behavior explicitly');
assert.ok(card.includes('PACKAGE_CONTENT_OPTIONS'), 'package content-type controls must remain inside the card');
assert.ok(card.includes('window.confirm('), 'final package deletion confirmation must remain intact');
assert.ok(lineCount(card) <= 430, `SchoolPackageCard must stay <= 430 lines; got ${lineCount(card)}`);

assert.ok(panel.includes("from './SchoolPackageCard';"), 'SchoolPackagesPanel must compose SchoolPackageCard');
assert.ok(panel.includes('<SchoolPackageCard'), 'SchoolPackagesPanel must render extracted package cards');
assert.ok(!panel.includes('PACKAGE_CONTENT_OPTIONS.map'), 'package-card content controls must not leak back into parent panel');
assert.ok(!panel.includes('pkg.revenueSharePercentage'), 'package-card commercial form fields must not leak back into parent panel');
assert.ok(!panel.includes('const packageCourses ='), 'package-specific presentation setup must remain outside the parent panel');
assert.ok(lineCount(panel) <= 430, `SchoolPackagesPanel should become an orchestration panel <= 430 lines; got ${lineCount(panel)}`);

for (const [file, source] of [[panelFile, panel], [cardFile, card]]) {
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
  phase: 'schools-package-card-boundary',
  status: 'PASS',
  panelLines: lineCount(panel),
  cardLines: lineCount(card),
}, null, 2));
