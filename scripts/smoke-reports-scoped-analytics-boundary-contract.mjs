import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const scopedAnalytics = read('pages/Reports/scopedAnalyticsViewModel.ts');
const reportsRole = read('scripts/smoke-reports-role-contract.mjs');
const globalJourney = read('scripts/smoke-global-student-journey-contract.mjs');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('Reports delegates scoped analytics presentation derivation to a pure view-model', () => {
  assertIncludes(reports, "from './Reports/scopedAnalyticsViewModel';");
  assertIncludes(reports, 'buildScopedInterventionPlan(scopedAnalytics)');
  assertIncludes(reports, 'buildScopedFollowUpSummary(scopedAnalytics, user.role)');
  assertNotIncludes(reports, 'const scopedInterventionPlan = useMemo(() => {');
  assertNotIncludes(reports, 'const scopedFollowUpSummary = useMemo(() => {');
});

check('scoped analytics view-model preserves intervention priorities and messaging', () => {
  assertIncludes(scopedAnalytics, 'export const buildScopedInterventionPlan = (');
  assertIncludes(scopedAnalytics, 'ابدأ بالمهارة الأكثر احتياجًا');
  assertIncludes(scopedAnalytics, 'تابع الطالب الأكثر احتياجًا');
  assertIncludes(scopedAnalytics, 'حوّلها لمسار تعلم تكيفي');
  assertIncludes(scopedAnalytics, 'بانتظار بيانات مهارات أكثر');
  assertIncludes(scopedAnalytics, 'لا يوجد طالب يحتاج تدخلًا واضحًا');
  assertIncludes(scopedAnalytics, 'اربط الاختبارات بالمواد والمهارات حتى يظهر مسار إعادة التعلم تلقائيًا.');
});

check('scoped analytics view-model preserves follow-up summary scope semantics', () => {
  assertIncludes(scopedAnalytics, 'export const buildScopedFollowUpSummary = (');
  assertIncludes(scopedAnalytics, "roleScopeTitle[role] || 'النطاق الحالي'");
  assertIncludes(scopedAnalytics, 'عدد الطلاب:');
  assertIncludes(scopedAnalytics, 'محاولات الاختبار:');
  assertIncludes(scopedAnalytics, 'أضعف مهارة:');
  assertIncludes(scopedAnalytics, 'أول طالب للمتابعة:');
  assertIncludes(scopedAnalytics, 'المادة التي تحتاج تدخلًا:');
  assertIncludes(scopedAnalytics, 'الإجراء المقترح: شرح قصير، تدريب علاجي، ثم اختبار قياس قصير.');
});

check('scoped analytics view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(scopedAnalytics, 'useStore');
  assertNotIncludes(scopedAnalytics, "from 'react'");
  assertNotIncludes(scopedAnalytics, "from '../../services/api'");
  assertNotIncludes(scopedAnalytics, 'api.');
  assertNotIncludes(scopedAnalytics, 'navigator.');
  assertNotIncludes(scopedAnalytics, 'window.');
  assertNotIncludes(scopedAnalytics, 'loadXlsx');
});

check('Reports contracts follow scoped analytics ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/scopedAnalyticsViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedInterventionPlan(scopedAnalytics)');");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedFollowUpSummary(scopedAnalytics, user.role)');");
  assertIncludes(globalJourney, "../pages/Reports/scopedAnalyticsViewModel.ts");
});

check('scoped analytics extraction reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const scopedLines = scopedAnalytics.split('\n').length;
  if (reportLines >= 3320) throw new Error(`Reports.tsx remained too large after scoped analytics extraction: ${reportLines}`);
  if (scopedLines > 120) throw new Error(`scopedAnalyticsViewModel.ts exceeded 120 lines: ${scopedLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-scoped-analytics-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  scopedAnalyticsLines: scopedAnalytics.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
