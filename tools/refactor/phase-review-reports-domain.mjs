import { spawnSync } from 'node:child_process';

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['frontend typecheck', 'npm', ['run', 'typecheck']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['reports domain boundary', 'node', ['scripts/smoke-reports-domain-boundary-contract.mjs']],
  ['reports role contract', 'npm', ['run', 'smoke:reports-role']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
  ['student learning journey contract', 'npm', ['run', 'smoke:student-learning-journey']],
  ['results contract', 'npm', ['run', 'smoke:results']],
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
  console.log(`\n[reports-domain-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
  if (result.status !== 0) {
    console.error(`\n[reports-domain-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log('\n[reports-domain-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
