import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const panelFile = 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx';
const cardFile = 'dashboards/admin/SchoolsManager/SchoolPackageCard.tsx';
const accessCodesFile = 'dashboards/admin/SchoolsManager/SchoolAccessCodesPanel.tsx';
const panel = read(panelFile);
const card = read(cardFile);
const accessCodes = read(accessCodesFile);

assert.ok(card.includes('export const SchoolPackageCard'), 'package card must expose a feature-owned presentation component');
assert.ok(!card.includes("from '../SchoolsManager'"), 'package card must never import the parent manager');
assert.ok(!card.includes("from '../../../services/api'"), 'package card must not call API directly');
assert.ok(!card.includes("from '../../../store/useStore'"), 'package card must not access global store directly');
assert.ok(card.includes('handleUpdateSchoolPackage'), 'package card must receive update behavior explicitly');
assert.ok(card.includes('handleDeleteSchoolPackage'), 'package card must receive delete behavior explicitly');
assert.ok(card.includes('assignCourseToGroup'), 'package card must receive course assignment behavior explicitly');
assert.ok(card.includes('PACKAGE_CONTENT_OPTIONS'), 'package content-type controls must remain inside the card');
assert.ok(card.includes('window.confirm('), 'final package deletion confirmation must remain intact');
assert.ok(lineCount(card) <= 400, `SchoolPackageCard must stay <= 400 lines; got ${lineCount(card)}`);

assert.ok(panel.includes("from './SchoolPackageCard';"), 'SchoolPackagesPanel must compose SchoolPackageCard');
assert.ok(panel.includes('<SchoolPackageCard'), 'SchoolPackagesPanel must render extracted package cards');
assert.ok(!panel.includes('PACKAGE_CONTENT_OPTIONS.map'), 'package-card content controls must not leak back into parent panel');
assert.ok(!panel.includes('pkg.revenueSharePercentage'), 'package-card commercial form fields must not leak back into parent panel');
assert.ok(!panel.includes('const packageCourses ='), 'package-specific presentation setup must remain outside the parent panel');
assert.ok(lineCount(panel) <= 350, `SchoolPackagesPanel should remain an orchestration panel <= 350 lines; got ${lineCount(panel)}`);

// Access-code deletion used to be owned by this parent. After the dedicated
// access-code boundary was introduced, preserve the same behavior in that child
// rather than forcing Trash2/delete confirmation back into the orchestration panel.
assert.ok(panel.includes("from './SchoolAccessCodesPanel';"), 'parent must compose the access-code presentation boundary');
assert.ok(panel.includes('<SchoolAccessCodesPanel'), 'parent must render the access-code presentation boundary');
assert.ok(accessCodes.includes("import { Key, Trash2 } from 'lucide-react';"), 'access-code child must own its delete icon');
assert.ok(accessCodes.includes("window.confirm('هل تريد حذف كود التفعيل هذا؟')"), 'access-code delete confirmation must remain intact after the move');
assert.ok(accessCodes.includes('handleDeleteSchoolAccessCode(code.id)'), 'access-code delete handler must remain wired');

for (const [file, source] of [[panelFile, panel], [cardFile, card], [accessCodesFile, accessCodes]]) {
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
