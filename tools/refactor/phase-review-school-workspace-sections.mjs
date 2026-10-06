import { spawnSync } from 'node:child_process';

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['frontend typecheck', 'npm', ['run', 'typecheck']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['school workspace sections presentation boundary', 'node', ['scripts/smoke-schools-workspace-sections-boundary-contract.mjs']],
  ['school class-card presentation boundary', 'node', ['scripts/smoke-schools-class-card-boundary-contract.mjs']],
  ['school student roster presentation boundary', 'node', ['scripts/smoke-schools-student-roster-boundary-contract.mjs']],
  ['school management contract', 'npm', ['run', 'smoke:school-management']],
  ['school XLSX safety contract', 'node', ['scripts/smoke-xlsx-safety-contract.mjs']],
  ['school import parsing/performance', 'npm', ['run', 'smoke:schools-import-parsing']],
  ['school readiness contract', 'node', ['scripts/smoke-schools-readiness-viewmodel-contract.mjs']],
  ['school relationship workspace contract', 'node', ['scripts/smoke-schools-relationship-viewmodel-contract.mjs']],
  ['school decision/handover workspace contract', 'node', ['scripts/smoke-schools-workspace-viewmodel-contract.mjs']],
  ['school roster projection/performance', 'node', ['scripts/smoke-schools-roster-viewmodel-contract.mjs']],
  ['school package access projection', 'node', ['scripts/smoke-schools-package-access-viewmodel-contract.mjs']],
  ['school package card boundary', 'node', ['scripts/smoke-schools-package-card-boundary-contract.mjs']],
  ['school access-code boundary', 'node', ['scripts/smoke-schools-access-codes-boundary-contract.mjs']],
  ['school relations import boundary', 'node', ['scripts/smoke-schools-relations-import-boundary-contract.mjs']],
  ['school relations report boundary', 'node', ['scripts/smoke-schools-relations-report-boundary-contract.mjs']],
  ['school relations status boundary', 'node', ['scripts/smoke-schools-relations-status-boundary-contract.mjs']],
  ['school quick supervisor boundary', 'node', ['scripts/smoke-schools-quick-supervisor-boundary-contract.mjs']],
  ['school reports boundary', 'node', ['scripts/smoke-schools-reports-boundary-contract.mjs']],
  ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
  ['school package revenue contract', 'node', ['scripts/smoke-package-revenue-contract.mjs']],
  ['school admin relationship contract', 'node', ['scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs']],
  ['school relationship audit contract', 'node', ['scripts/smoke-batch100f-relationship-audit-contract.mjs']],
  ['repository architecture snapshot', 'node', ['tools/refactor/repository-audit.mjs']],
  ['immutable architecture gate', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['progressive module boundary gate', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
  ['quiz integrity contract', 'npm', ['run', 'smoke:quiz-integrity-guard']],
  ['authentication security contract', 'npm', ['run', 'smoke:auth-login-security']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[workspace-sections-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
  if (result.status !== 0) {
    console.error(`\n[workspace-sections-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log('\n[workspace-sections-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
