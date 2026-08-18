import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const write = (file, content) => writeFileSync(path.join(root, file), content, 'utf8');

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Duplicate ${label}`);
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function replaceRangeWithin(source, sectionMarker, startMarker, endMarker, replacement, label) {
  const sectionStart = source.indexOf(sectionMarker);
  if (sectionStart < 0) throw new Error(`Missing ${label} section marker`);
  const start = source.indexOf(startMarker, sectionStart);
  if (start < 0) throw new Error(`Missing ${label} start marker`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing ${label} end marker`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const reportsPath = 'pages/Reports.tsx';
const roleContractPath = 'scripts/smoke-reports-role-contract.mjs';

let reports = read(reportsPath);
let roleContract = read(roleContractPath);

const exportImport = "import { buildScopedSkillsWorkbookRows, buildScopedStudentsWorkbookRows } from './Reports/scopedExportRowsViewModel';";
const skillsDelegation = 'const rows = buildScopedSkillsWorkbookRows(scopedSkillReportCards);';
const studentsDelegation = 'const rows = buildScopedStudentsWorkbookRows(scopedStudentFocusCards);';
const roleOwnership = "../pages/Reports/scopedExportRowsViewModel.ts";

const alreadyApplied = reports.includes(exportImport)
  && reports.includes(skillsDelegation)
  && reports.includes(studentsDelegation)
  && roleContract.includes(roleOwnership);

if (alreadyApplied) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'scoped-export-rows' }, null, 2));
  process.exit(0);
}

if (!reports.includes(exportImport)) {
  reports = replaceOnce(
    reports,
    "import { buildScopedRemediationFallback } from './Reports/scopedRemediationFallbackViewModel';\n",
    "import { buildScopedRemediationFallback } from './Reports/scopedRemediationFallbackViewModel';\nimport { buildScopedSkillsWorkbookRows, buildScopedStudentsWorkbookRows } from './Reports/scopedExportRowsViewModel';\n",
    'scoped remediation fallback import anchor',
  );
}

if (!reports.includes(skillsDelegation)) {
  reports = replaceRangeWithin(
    reports,
    '    const downloadScopedSkillsWorkbook = async () => {\n',
    '        const rows = [\n',
    "\n\n        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'skills-report');",
    '        const rows = buildScopedSkillsWorkbookRows(scopedSkillReportCards);',
    'scoped skills workbook rows',
  );
}

if (!reports.includes(studentsDelegation)) {
  reports = replaceRangeWithin(
    reports,
    '    const downloadScopedStudentsWorkbook = async () => {\n',
    '        const rows = [\n',
    "\n\n        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'students-report');",
    '        const rows = buildScopedStudentsWorkbookRows(scopedStudentFocusCards);',
    'scoped students workbook rows',
  );
}

reports = reports
  .replace(
    "    const downloadScopedSkillsWorkbook = async () => {\n        if (!scopedAnalytics?.weakestSkills?.length) return;\n\n        const XLSX = await loadXlsx();",
    "    const downloadScopedSkillsWorkbook = async () => {\n        if (!scopedAnalytics?.weakestSkills?.length) return;\n        const XLSX = await loadXlsx();",
  )
  .replace(
    "        const rows = buildScopedSkillsWorkbookRows(scopedSkillReportCards);\n\n        XLSX.utils.book_append_sheet",
    "        const rows = buildScopedSkillsWorkbookRows(scopedSkillReportCards);\n        XLSX.utils.book_append_sheet",
  )
  .replace(
    "    const downloadScopedStudentsWorkbook = async () => {\n        if (!scopedAnalytics?.weakestStudents?.length) return;\n\n        const XLSX = await loadXlsx();",
    "    const downloadScopedStudentsWorkbook = async () => {\n        if (!scopedAnalytics?.weakestStudents?.length) return;\n        const XLSX = await loadXlsx();",
  )
  .replace(
    "        const rows = buildScopedStudentsWorkbookRows(scopedStudentFocusCards);\n\n        XLSX.utils.book_append_sheet",
    "        const rows = buildScopedStudentsWorkbookRows(scopedStudentFocusCards);\n        XLSX.utils.book_append_sheet",
  );

if (!roleContract.includes(roleOwnership)) {
  roleContract = replaceOnce(
    roleContract,
    "  await readFile(new URL('../pages/Reports/scopedRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/scopedRemediationFallbackViewModel.ts', import.meta.url), 'utf8'),\n  await readFile(new URL('../pages/Reports/scopedExportRowsViewModel.ts', import.meta.url), 'utf8'),\n",
    'reports role scoped export ownership list',
  );
}

write(reportsPath, reports);
write(roleContractPath, roleContract);

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'scoped-export-rows',
  files: [reportsPath, roleContractPath],
}, null, 2));
