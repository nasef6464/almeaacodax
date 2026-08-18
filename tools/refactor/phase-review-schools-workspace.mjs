import { spawnSync } from 'node:child_process';

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['frontend typecheck', 'npm', ['run', 'typecheck']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['school readiness view-model logic', 'node', ['scripts/smoke-schools-readiness-viewmodel-contract.mjs']],
  ['school relationship workspace logic', 'node', ['scripts/smoke-schools-relationship-viewmodel-contract.mjs']],
  ['school decision/handover workspace logic', 'node', ['scripts/smoke-schools-workspace-viewmodel-contract.mjs']],
  ['school import parser logic/performance', 'npm', ['run', 'smoke:schools-import-parsing']],
  ['school management contract', 'npm', ['run', 'smoke:school-management']],
  ['school XLSX safety contract', 'npm', ['run', 'smoke:xlsx-safety']],
  ['school package revenue contract', 'npm', ['run', 'smoke:package-revenue']],
  ['school admin/parent/payment contract', 'npm', ['run', 'smoke:batch136-admin-users-schools-parent-payment']],
  ['school relationship audit contract', 'npm', ['run', 'smoke:batch100f-relationship-audit']],
  ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
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
  console.log(`\n[schools-workspace-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });

  if (result.status !== 0) {
    console.error(`\n[schools-workspace-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log('\n[schools-workspace-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
