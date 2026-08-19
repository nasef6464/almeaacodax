import { readFile } from 'node:fs/promises';

const reports = await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8');
const fallback = await readFile(new URL('../pages/Reports/scopedRemediationFallbackViewModel.ts', import.meta.url), 'utf8');

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

check('Reports delegates scoped remediation fallback to a focused view-model', () => {
  assertIncludes(reports, "import { buildScopedRemediationFallback } from './Reports/scopedRemediationFallbackViewModel';");
  assertIncludes(reports, 'setScopedSmartRemediation(buildScopedRemediationFallback(skillPayload));');
  assertNotIncludes(reports, "title: 'خطة تدخل للنطاق الحالي'");
});

check('scoped remediation fallback preserves institutional intervention copy', () => {
  assertIncludes(fallback, "title: 'خطة تدخل للنطاق الحالي'");
  assertIncludes(fallback, 'ابدأ بالمهارة الأكثر ضعفًا، وجه شرحًا قصيرًا، ثم اختبار متابعة لقياس التحسن.');
  assertIncludes(fallback, 'أنشئ شرحًا أو حصة قصيرة لهذه المهارة.');
  assertIncludes(fallback, 'وجّه تدريبًا علاجيًا للطلاب المتأثرين.');
  assertIncludes(fallback, 'أعد القياس باختبار قصير موجه لنفس المهارة.');
});

check('scoped remediation fallback preserves first-step versus follow-up semantics', () => {
  assertIncludes(fallback, 'skillPayload.slice(0, 3)');
  assertIncludes(fallback, 'index === 0');
  assertIncludes(fallback, 'displayText(skill.skill)');
});

check('scoped remediation fallback remains deterministic and runtime-side-effect free', () => {
  for (const forbidden of ['React', 'useStore', 'api.', 'window.', 'navigator.', 'localStorage', 'sessionStorage']) {
    assertNotIncludes(fallback, forbidden);
  }
});

check('AI and intervention creation side effects remain owned by Reports', () => {
  assertIncludes(reports, 'api.aiRemediationPlan({');
  assertIncludes(reports, 'api.createInterventionStudyPlan({');
  assertIncludes(reports, 'setScopedSmartRemediationLoading(true)');
  assertIncludes(reports, 'setScopedSmartRemediationLoading(false)');
});

check('scoped fallback extraction reduces Reports without creating another hotspot', () => {
  const reportsLines = reports.split('\n').length;
  const fallbackLines = fallback.split('\n').length;
  if (reportsLines >= 2775) throw new Error(`Reports.tsx is still too large after scoped fallback extraction: ${reportsLines}`);
  if (fallbackLines > 40) throw new Error(`scopedRemediationFallbackViewModel.ts is too large: ${fallbackLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'reports-scoped-remediation-fallback-view-model',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  fallbackLines: fallback.split('\n').length,
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
