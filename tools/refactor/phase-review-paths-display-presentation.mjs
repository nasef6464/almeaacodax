import { spawnSync } from 'node:child_process';

const apply = spawnSync('node', ['tools/refactor/apply-paths-display-presentation.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (apply.status !== 0) {
  console.error('[paths-display-presentation-phase-review] Apply/confirm failed');
  process.exit(apply.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['repository typecheck', 'npm', ['run', 'typecheck']],
  ['frontend production build', 'npm', ['run', 'build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['paths display presentation boundary', 'node', ['scripts/smoke-paths-display-presentation-boundary-contract.mjs', '--require-post']],
  ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[paths-display-presentation-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[paths-display-presentation-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const allowedFiles = new Set(['dashboards/admin/PathsManager.tsx']);
const changed = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8', shell: process.platform === 'win32' });
const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (changed.status !== 0 || untracked.status !== 0) {
  console.error('[paths-display-presentation-phase-review] Failed to inspect working-tree scope');
  process.exit(1);
}
const changedFiles = [...new Set(`${changed.stdout || ''}\n${untracked.stdout || ''}`.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];

if (changedFiles.length === 0) {
  console.log('\n[paths-display-presentation-phase-review] ALL CHECKS PASS — verified clean no-op');
  console.log(JSON.stringify({ results, changedFiles, mode: 'NO_OP' }, null, 2));
  process.exit(0);
}

const unexpected = changedFiles.filter((file) => !allowedFiles.has(file));
if (unexpected.length) {
  console.error(`[paths-display-presentation-phase-review] Unexpected changed files: ${unexpected.join(', ')}`);
  process.exit(1);
}
for (const required of allowedFiles) {
  if (!changedFiles.includes(required)) {
    console.error(`[paths-display-presentation-phase-review] Expected verified change missing: ${required}`);
    process.exit(1);
  }
}

const stage = spawnSync('git', ['add', ...allowedFiles], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stage.status !== 0) {
  console.error('[paths-display-presentation-phase-review] Failed to stage verified files');
  process.exit(stage.status ?? 1);
}

console.log('\n[paths-display-presentation-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify({ results, changedFiles, mode: 'APPLY' }, null, 2));
