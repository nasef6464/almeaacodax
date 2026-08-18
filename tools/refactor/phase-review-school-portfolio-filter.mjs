import { spawnSync } from 'node:child_process';

const steps = [
  ['frontend typecheck', 'npm', ['run', 'typecheck']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['portfolio filter presentation boundary', 'node', ['scripts/smoke-schools-portfolio-filter-boundary-contract.mjs']],
  ['architecture audit', 'node', ['tools/refactor/repository-audit.mjs']],
  ['architecture gate', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary gate', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['school management contract', 'node', ['scripts/smoke-school-management-contract.mjs']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of steps) {
  console.log(`\n[portfolio-filter-phase-review] START ${name}`);
  const started = Date.now();
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  const status = result.status === 0 ? 'PASS' : 'FAIL';
  results.push({ name, status, durationMs: Date.now() - started });
  if (result.status !== 0) {
    console.error(`\n[portfolio-filter-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log('\n[portfolio-filter-phase-review] PASS');
console.log(JSON.stringify(results, null, 2));
