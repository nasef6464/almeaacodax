import { execFileSync } from 'node:child_process';

const root = process.cwd();
const steps = [
  ['apply current refactor phase', ['node', 'tools/refactor/apply-dashboard-path-progress.mjs']],
  ['git diff whitespace validation', ['git', 'diff', '--check']],
  ['repository typecheck', ['npm', 'run', 'typecheck']],
  ['frontend production build', ['npm', 'run', 'build']],
  ['architecture contract', ['node', 'tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', ['node', 'tools/refactor/module-boundary-gate.mjs']],
  ['Dashboard path progress boundary', ['node', 'scripts/smoke-dashboard-path-progress-boundary-contract.mjs']],
  ['student path scope contract', ['node', 'scripts/smoke-student-path-scope-contract.mjs']],
  ['frontend performance contract', ['npm', 'run', 'smoke:performance']],
  ['route loading contract', ['npm', 'run', 'smoke:route-loading']],
  ['runtime source contract', ['npm', 'run', 'smoke:runtime-source']],
  ['global student journey contract', ['npm', 'run', 'smoke:global-student-journey']],
];

const results = [];
for (const [name, command] of steps) {
  const [bin, ...args] = command;
  const started = Date.now();
  console.log(`\n[dashboard-path-progress-phase-review] START ${name}`);
  try {
    execFileSync(bin, args, { cwd: root, stdio: 'inherit' });
    results.push({ name, status: 'PASS', durationMs: Date.now() - started });
  } catch (error) {
    results.push({ name, status: 'FAIL', durationMs: Date.now() - started });
    console.error(`\n[dashboard-path-progress-phase-review] FAIL ${name}`);
    console.error(JSON.stringify({ results }, null, 2));
    process.exit(typeof error.status === 'number' ? error.status : 1);
  }
}

const changedFiles = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: root, encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const unexpected = changedFiles.filter((file) => file !== 'pages/Dashboard.tsx');
if (unexpected.length) {
  console.error(`Unexpected staged files: ${unexpected.join(', ')}`);
  process.exit(1);
}

console.log('\n[dashboard-path-progress-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify({ results, changedFiles, mode: changedFiles.length ? 'APPLY' : 'NO_OP' }, null, 2));
