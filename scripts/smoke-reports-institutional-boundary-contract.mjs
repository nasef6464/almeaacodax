import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const institutional = read('pages/Reports/institutionalReportViewModel.ts');
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

check('Reports delegates institutional summaries while keeping alert side effects in React', () => {
  assertIncludes(reports, "from './Reports/institutionalReportViewModel';");
  assertIncludes(reports, 'buildScopedLeadStudentSummary(scopedLeadStudent)');
  assertIncludes(reports, 'buildInstitutionalReportHub({');
  assertIncludes(reports, 'const copyInstitutionalAlert = async () =>');
  assertIncludes(reports, 'await navigator.clipboard.writeText(institutionalReportHub.alertText)');
  assertIncludes(reports, 'const sendInterventionAlert = async () =>');
  assertIncludes(reports, 'await api.sendInterventionAlert({');
  assertNotIncludes(reports, 'const roleLabel =\n            user.role === Role.ADMIN');
  assertNotIncludes(reports, 'const weakSkillsText = scopedLeadStudent.weakestSkills');
});

check('institutional view-model preserves lead-student summary semantics', () => {
  assertIncludes(institutional, 'export const buildScopedLeadStudentSummary = (');
  assertIncludes(institutional, '.slice(0, 2)');
  assertIncludes(institutional, 'ابدأ بمتابعة');
  assertIncludes(institutional, 'متوسطه الحالي');
  assertIncludes(institutional, 'أبرز المهارات:');
  assertIncludes(institutional, 'الإجراء المقترح: شرح قصير ثم تدريب علاجي ثم إعادة قياس.');
});

check('institutional view-model preserves role labels and scoped actions', () => {
  assertIncludes(institutional, "role === Role.ADMIN\n            ? 'مدير المنصة'");
  assertIncludes(institutional, "role === Role.SUPERVISOR\n                ? 'مشرف'");
  assertIncludes(institutional, "role === Role.TEACHER\n                    ? 'معلم'");
  assertIncludes(institutional, "'ولي أمر'");
  assertIncludes(institutional, 'وجّه اختبار متابعة على');
  assertIncludes(institutional, 'ابدأ برسالة متابعة إلى');
  assertIncludes(institutional, 'انتظر نتائج أكثر أو وجّه اختبارًا تشخيصيًا قصيرًا.');
});

check('institutional view-model preserves role-specific navigation and alert text', () => {
  assertIncludes(institutional, "role === Role.PARENT\n        ? '/dashboard?tab=reports'");
  assertIncludes(institutional, "? '/admin-dashboard?tab=users'");
  assertIncludes(institutional, "? '/admin-dashboard?tab=schools'");
  assertIncludes(institutional, "? '/admin-dashboard?tab=quizzes'");
  assertIncludes(institutional, "role === Role.ADMIN ? '/admin-dashboard?tab=notifications' : '/reports'");
  assertIncludes(institutional, 'buildDirectedQuizManagerLink({');
  assertIncludes(institutional, 'تنبيه متابعة من منصة المئة -');
  assertIncludes(institutional, 'المطلوب: شرح قصير، تدريب علاجي، ثم اختبار قياس قصير.');
});

check('institutional view-model remains deterministic and runtime-side-effect free', () => {
  assertNotIncludes(institutional, 'useStore');
  assertNotIncludes(institutional, "from 'react'");
  assertNotIncludes(institutional, "from '../../services/api'");
  assertNotIncludes(institutional, 'api.');
  assertNotIncludes(institutional, 'navigator.');
  assertNotIncludes(institutional, 'window.');
  assertNotIncludes(institutional, 'setCopiedInstitutionalAlert');
  assertNotIncludes(institutional, 'sendInterventionAlert');
});

check('Reports contracts follow institutional report ownership', () => {
  assertIncludes(reportsRole, "../pages/Reports/institutionalReportViewModel.ts");
  assertIncludes(globalJourney, "../pages/Reports/institutionalReportViewModel.ts");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildInstitutionalReportHub({');");
  assertIncludes(reportsRole, "assertIncludes(reportsSource, 'buildScopedLeadStudentSummary(scopedLeadStudent)');");
});

check('institutional extraction reduces Reports without creating a replacement hotspot', () => {
  const reportLines = reports.split('\n').length;
  const institutionalLines = institutional.split('\n').length;
  if (reportLines >= 3100) throw new Error(`Reports.tsx remained too large after institutional extraction: ${reportLines}`);
  if (institutionalLines > 150) throw new Error(`institutionalReportViewModel.ts exceeded 150 lines: ${institutionalLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-institutional-report-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  institutionalLines: institutional.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
