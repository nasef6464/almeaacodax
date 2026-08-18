import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const lineCount = (text) => text.split(/\r?\n/).length;

const managerFile = 'dashboards/admin/SchoolsManager.tsx';
const rowParserFile = 'dashboards/admin/SchoolsManager/importRowParsing.ts';
const fileReaderFile = 'dashboards/admin/SchoolsManager/importFileReaders.ts';
const manager = read(managerFile);
const rowParserSource = read(rowParserFile);
const fileReaderSource = read(fileReaderFile);

assert.ok(manager.includes("from './SchoolsManager/importFileReaders';"), 'SchoolsManager must delegate file parsing.');
assert.ok(manager.includes("from './SchoolsManager/importRowParsing';"), 'SchoolsManager must delegate duplicate-email parsing.');
assert.ok(!manager.includes("from '../../utils/xlsxLoader';"), 'SchoolsManager must not own XLSX transport after extraction.');
assert.ok(!manager.includes('const normalizeHeader ='), 'Header normalization must live outside the manager component.');
assert.ok(!manager.includes('const parseImportRows ='), 'Student row parsing must live outside the manager component.');
assert.ok(!manager.includes('const parseRelationRows ='), 'Relationship row parsing must live outside the manager component.');
assert.ok(lineCount(manager) <= 5100, `SchoolsManager regression: ${lineCount(manager)} lines exceeds the 5100-line phase budget.`);
assert.ok(lineCount(rowParserSource) <= 300, 'Pure school import row parser must stay <= 300 lines.');
assert.ok(lineCount(fileReaderSource) <= 180, 'School import file reader must stay <= 180 lines.');
assert.ok(!rowParserSource.includes('xlsxLoader'), 'Pure row parsing must stay XLSX-independent.');
assert.ok(!rowParserSource.includes('File)'), 'Pure row parsing must stay browser File-independent.');
assert.ok(fileReaderSource.includes("from '../../../utils/xlsxLoader';"), 'File reader must use the audited lazy XLSX loader.');
for (const helper of ['loadXlsx', 'registerXlsxRuntime', 'readWorkbookFromBuffer', 'sheetToSafeRows']) {
  assert.ok(fileReaderSource.includes(helper), `File reader must preserve safe XLSX helper ${helper}.`);
}
assert.ok(!fileReaderSource.includes("from 'xlsx'"), 'File reader must never import the legacy xlsx package.');
assert.ok(!fileReaderSource.includes('import * as XLSX'), 'File reader must never statically bundle XLSX.');

const transpiled = ts.transpileModule(rowParserSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
  reportDiagnostics: true,
});
const fatalDiagnostics = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
assert.equal(fatalDiagnostics.length, 0, 'Pure row parser must transpile without diagnostics.');

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`;
const parser = await import(moduleUrl);

assert.deepEqual(
  parser.parseImportRows([
    ['Name', 'Email', 'Class', 'Password'],
    ['  أحمد محمد  ', ' STUDENT@Example.com ', ' 3/A ', ' temporary-pass '],
    ['', '', '', ''],
  ]),
  [{ name: 'أحمد محمد', email: 'STUDENT@Example.com', className: '3/A', password: 'temporary-pass' }],
  'English student import aliases and trimming must remain stable.',
);

assert.deepEqual(
  parser.parseImportRows([
    ['اِســم الطَّالِب', 'البريد الإلكتروني', 'اسم الفصل', 'كلمة المرور'],
    ['سارة', 'sara@example.com', 'الثالث أ', '12345678'],
  ]),
  [{ name: 'سارة', email: 'sara@example.com', className: 'الثالث أ', password: '12345678' }],
  'Arabic header normalization, diacritics and tatweel handling must remain stable.',
);

assert.deepEqual(
  parser.parseRelationRows([
    ['بريد الطالب', 'بريد ولي الأمر', 'اسم ولي الأمر', 'بريد المشرف', 'اسم المشرف', 'اسم الفصل'],
    ['student@example.com', 'parent@example.com', 'ولي الطالب', 'teacher@example.com', 'المشرف', 'الفصل 1'],
  ]),
  [{
    studentEmail: 'student@example.com',
    parentEmail: 'parent@example.com',
    parentName: 'ولي الطالب',
    supervisorEmail: 'teacher@example.com',
    supervisorName: 'المشرف',
    className: 'الفصل 1',
  }],
  'Relationship import aliases must remain stable.',
);

assert.throws(
  () => parser.parseImportRows([['Name'], ['Student']]),
  /name و email/,
  'Student import must continue rejecting files without both required columns.',
);
assert.throws(
  () => parser.parseRelationRows([['parentEmail'], ['parent@example.com']]),
  /بريد الطالب/,
  'Relationship import must continue requiring student email.',
);
assert.deepEqual(
  parser.getDuplicateImportEmails([
    { name: 'A', email: 'Student@Example.com' },
    { name: 'B', email: ' student@example.com ' },
    { name: 'C', email: 'other@example.com' },
    { name: 'D', email: 'OTHER@example.com' },
  ]),
  ['student@example.com', 'other@example.com'],
  'Duplicate detection must remain trimmed and case-insensitive.',
);

const largeRows = [['name', 'email', 'className', 'password']];
for (let index = 0; index < 10000; index += 1) {
  largeRows.push([`Student ${index}`, `student${index}@example.com`, `Class ${index % 30}`, 'pass']);
}
const startedAt = performance.now();
const parsedLargeRows = parser.parseImportRows(largeRows);
const elapsedMs = performance.now() - startedAt;
assert.equal(parsedLargeRows.length, 10000, 'Large import parsing must preserve all valid rows.');
assert.ok(elapsedMs < 2000, `10k-row parser regression: ${elapsedMs.toFixed(1)}ms exceeds the 2000ms safety ceiling.`);

console.log(JSON.stringify({
  phase: 'schools-import-parsing',
  status: 'PASS',
  managerLines: lineCount(manager),
  rowParserLines: lineCount(rowParserSource),
  fileReaderLines: lineCount(fileReaderSource),
  parsedRows: parsedLargeRows.length,
  parse10kMs: Number(elapsedMs.toFixed(2)),
}, null, 2));
