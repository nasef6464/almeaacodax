import { readFile } from 'node:fs/promises';

const reports = await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8');
const fallback = await readFile(new URL('../pages/Reports/studentRemediationFallbackViewModel.ts', import.meta.url), 'utf8');

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

check('Reports delegates the local student remediation fallback to a focused view-model', () => {
  assertIncludes(reports, "import { buildStudentRemediationFallback } from './Reports/studentRemediationFallbackViewModel';");
  assertIncludes(reports, 'setSmartRemediation(buildStudentRemediationFallback(focusedReportSkills));');
  assertNotIncludes(reports, "title: 'خطة علاجية قصيرة'");
});

check('student remediation fallback preserves the learner-facing plan copy', () => {
  assertIncludes(fallback, "title: 'خطة علاجية قصيرة'");
  assertIncludes(fallback, 'ابدأ بأضعف مهارة، راجع شرحًا بسيطًا، ثم حل تدريبًا قصيرًا وأعد القياس.');
  assertIncludes(fallback, 'أعد اختبارًا مصغرًا من 5 أسئلة على نفس المهارة.');
  assertIncludes(fallback, 'تابع التقدم بهدوء. المطلوب الآن خطوة صغيرة يوميًا وليس ضغطًا زائدًا.');
});

check('student remediation fallback preserves weak versus average action semantics', () => {
  assertIncludes(fallback, 'skill.mastery < 50');
  assertIncludes(fallback, 'راجع شرحًا قصيرًا ثم حل 5 أسئلة سهلة.');
  assertIncludes(fallback, 'حل تدريبًا متدرجًا ثم راجع الأخطاء.');
  assertIncludes(fallback, 'focusedReportSkills.slice(0, 3)');
});

check('student remediation fallback remains deterministic and runtime-side-effect free', () => {
  for (const forbidden of ['React', 'useStore', 'api.', 'window.', 'navigator.', 'localStorage', 'sessionStorage']) {
    assertNotIncludes(fallback, forbidden);
  }
});

check('AI and loading side effects remain owned by Reports', () => {
  assertIncludes(reports, 'api.aiRemediationPlan({');
  assertIncludes(reports, 'setSmartRemediationLoading(true)');
  assertIncludes(reports, 'setSmartRemediationLoading(false)');
});

check('fallback extraction reduces Reports without creating another hotspot', () => {
  const reportsLines = reports.split('\n').length;
  const fallbackLines = fallback.split('\n').length;
  if (reportsLines >= 2780) throw new Error(`Reports.tsx is still too large after fallback extraction: ${reportsLines}`);
  if (fallbackLines > 40) throw new Error(`studentRemediationFallbackViewModel.ts is too large: ${fallbackLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-student-remediation-fallback-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  fallbackLines: fallback.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
