import { spawnSync } from 'node:child_process';

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
  console.log(`\n[reports-scoped-skill-report-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
  if (result.status !== 0) {
    console.error(`\n[reports-scoped-skill-report-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log('\n[reports-scoped-skill-report-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
