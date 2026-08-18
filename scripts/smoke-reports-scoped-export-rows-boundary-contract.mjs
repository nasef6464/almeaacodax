import { readFile } from 'node:fs/promises';

const reports = await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8');
const exportRows = await readFile(new URL('../pages/Reports/scopedExportRowsViewModel.ts', import.meta.url), 'utf8');
const roleContract = await readFile(new URL('./smoke-reports-role-contract.mjs', import.meta.url), 'utf8');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment) {
  if (source.includes(fragment)) throw new Error(`Unexpected fragment: ${fragment}`);
}

check('Reports delegates scoped skills and students workbook row projection', () => {
  assertIncludes(reports, "import { buildScopedSkillsWorkbookRows, buildScopedStudentsWorkbookRows } from './Reports/scopedExportRowsViewModel';");
  assertIncludes(reports, 'const rows = buildScopedSkillsWorkbookRows(scopedSkillReportCards);');
  assertIncludes(reports, 'const rows = buildScopedStudentsWorkbookRows(scopedStudentFocusCards);');
  assertNotIncludes(reports, "['المهارة', 'المحور', 'نسبة الإتقان', 'طلاب متأثرون'");
  assertNotIncludes(reports, "['الطالب', 'المجموعات', 'متوسط الأداء', 'عدد المحاولات'");
});

check('scoped export rows preserve skills workbook columns and fallbacks', () => {
  assertIncludes(exportRows, "['المهارة', 'المحور', 'نسبة الإتقان', 'طلاب متأثرون', 'محاولات', 'الإجراء المقترح', 'شرح / دعم', 'اختبار موجه']");
  assertIncludes(exportRows, "displayText(skill.recommendedAction) || 'شرح قصير ثم تدريب علاجي ثم اختبار متابعة.'");
  assertIncludes(exportRows, "displayText(skill.lessonTitle) || '-'");
  assertIncludes(exportRows, "displayText(skill.quizTitle) || '-'");
});

check('scoped export rows preserve student workbook columns and summaries', () => {
  assertIncludes(exportRows, "['الطالب', 'المجموعات', 'متوسط الأداء', 'عدد المحاولات', 'مهارات تحتاج دعم', 'أبرز المهارات', 'الإجراء المقترح']");
  assertIncludes(exportRows, "student.groupNames.map((name) => displayText(name)).join('، ')");
  assertIncludes(exportRows, "student.topSkills.map((skill) => `${displayText(skill.skill)} ${skill.mastery}%`).join('، ')");
  assertIncludes(exportRows, "displayText(student.recommendedAction) || 'شرح قصير ثم تدريب موجه ثم قياس.'");
});

check('XLSX loading and browser file side effects remain owned by Reports', () => {
  assertIncludes(reports, 'const XLSX = await loadXlsx();');
  assertIncludes(reports, "XLSX.writeFile(workbook, `skills-report-${new Date().toISOString().slice(0, 10)}.xlsx`);");
  assertIncludes(reports, "XLSX.writeFile(workbook, `students-performance-report-${new Date().toISOString().slice(0, 10)}.xlsx`);");
  for (const forbidden of ['loadXlsx', 'XLSX.', 'Blob', 'window.', 'document.', 'navigator.']) {
    assertNotIncludes(exportRows, forbidden);
  }
});

check('reports role contract follows scoped export ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/scopedExportRowsViewModel.ts");
});

check('scoped export row extraction reduces Reports without creating another hotspot', () => {
  const reportsLines = reports.split('\n').length;
  const exportLines = exportRows.split('\n').length;
  if (reportsLines >= 2745) throw new Error(`Reports.tsx is still too large after scoped export row extraction: ${reportsLines}`);
  if (exportLines > 70) throw new Error(`scopedExportRowsViewModel.ts is too large: ${exportLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-scoped-export-rows-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  exportLines: exportRows.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
