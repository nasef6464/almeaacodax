import { spawnSync } from 'node:child_process';

const applyReadiness = spawnSync('node', ['tools/refactor/apply-reports-student-readiness.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applyReadiness.status !== 0) {
  console.error('[reports-student-report-scope-phase-review] Failed to verify student readiness extraction');
  process.exit(applyReadiness.status ?? 1);
}

const applyLearningLoop = spawnSync('node', ['tools/refactor/apply-reports-student-learning-loop.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applyLearningLoop.status !== 0) {
  console.error('[reports-student-report-scope-phase-review] Failed to verify student learning loop extraction');
  process.exit(applyLearningLoop.status ?? 1);
}

const applyStudentReportScope = spawnSync('node', ['tools/refactor/apply-reports-student-report-scope.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applyStudentReportScope.status !== 0) {
  console.error('[reports-student-report-scope-phase-review] Failed to apply student report scope extraction');
  process.exit(applyStudentReportScope.status ?? 1);
}

const applyStudentRemediationFallback = spawnSync('node', ['tools/refactor/apply-reports-student-remediation-fallback.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applyStudentRemediationFallback.status !== 0) {
  console.error('[reports-student-report-scope-phase-review] Failed to apply student remediation fallback extraction');
  process.exit(applyStudentRemediationFallback.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['frontend typecheck', 'npm', ['run', 'typecheck']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['reports scoped skill report boundary', 'node', ['scripts/smoke-reports-scoped-skill-report-boundary-contract.mjs']],
  ['reports scoped student focus boundary', 'node', ['scripts/smoke-reports-scoped-student-focus-boundary-contract.mjs']],
  ['reports institutional boundary', 'node', ['scripts/smoke-reports-institutional-boundary-contract.mjs']],
  ['reports directed quiz analytics boundary', 'node', ['scripts/smoke-reports-directed-quiz-analytics-boundary-contract.mjs']],
  ['reports scoped comparison boundary', 'node', ['scripts/smoke-reports-scoped-comparison-boundary-contract.mjs']],
  ['reports scoped analytics boundary', 'node', ['scripts/smoke-reports-scoped-analytics-boundary-contract.mjs']],
  ['reports student analytics boundary', 'node', ['scripts/smoke-reports-student-analytics-boundary-contract.mjs']],
  ['reports student weekly plan boundary', 'node', ['scripts/smoke-reports-student-weekly-plan-boundary-contract.mjs']],
  ['reports student report actions boundary', 'node', ['scripts/smoke-reports-student-report-actions-boundary-contract.mjs']],
  ['reports student skill rows boundary', 'node', ['scripts/smoke-reports-student-skill-rows-boundary-contract.mjs']],
  ['reports student readiness boundary', 'node', ['scripts/smoke-reports-student-readiness-boundary-contract.mjs']],
  ['reports student learning loop boundary', 'node', ['scripts/smoke-reports-student-learning-loop-boundary-contract.mjs']],
  ['reports student report scope boundary', 'node', ['scripts/smoke-reports-student-report-scope-boundary-contract.mjs']],
  ['reports student remediation fallback boundary', 'node', ['scripts/smoke-reports-student-remediation-fallback-boundary-contract.mjs']],
  ['reports recommendation boundary', 'node', ['scripts/smoke-reports-recommendation-boundary-contract.mjs']],
  ['reports domain boundary', 'node', ['scripts/smoke-reports-domain-boundary-contract.mjs']],
  ['reports role contract', 'npm', ['run', 'smoke:reports-role']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
  ['student learning journey contract', 'npm', ['run', 'smoke:student-learning-journey']],
  ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[reports-student-report-scope-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
  if (result.status !== 0) {
    console.error(`\n[reports-student-report-scope-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stagePerformanceContract = spawnSync('git', ['add', 'scripts/smoke-performance-contract.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (stagePerformanceContract.status !== 0) {
  console.error('[reports-student-report-scope-phase-review] Failed to stage performance ownership update');
  process.exit(stagePerformanceContract.status ?? 1);
}

console.log('\n[reports-student-report-scope-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));