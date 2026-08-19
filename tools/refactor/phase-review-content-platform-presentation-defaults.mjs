import { spawnSync } from 'node:child_process';

const apply = spawnSync('node', ['tools/refactor/apply-content-platform-presentation-defaults.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (apply.status !== 0) {
  console.error('[content-platform-presentation-defaults-phase-review] Apply/confirm failed');
  process.exit(apply.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['presentation defaults boundary', 'node', ['scripts/smoke-content-platform-presentation-defaults-boundary-contract.mjs']],
  ['homepage hero contract', 'npm', ['run', 'smoke:homepage-hero']],
  ['platform fonts contract', 'npm', ['run', 'smoke:platform-fonts']],
  ['content RBAC CRUD scope contract', 'node', ['scripts/smoke-rbac-content-crud-scope-contract.mjs']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-platform-presentation-defaults-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[content-platform-presentation-defaults-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const allowedFiles = new Set([
  'server/src/routes/content.routes.ts',
  'server/src/modules/content/presentation/platformPresentationDefaults.ts',
  'scripts/smoke-homepage-hero-contract.mjs',
]);
const changed = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8', shell: process.platform === 'win32' });
const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (changed.status !== 0 || untracked.status !== 0) {
  console.error('[content-platform-presentation-defaults-phase-review] Failed to inspect working-tree scope');
  process.exit(1);
}
const changedFiles = [...new Set(`${changed.stdout || ''}\n${untracked.stdout || ''}`.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];

if (changedFiles.length === 0) {
  console.log('\n[content-platform-presentation-defaults-phase-review] ALL CHECKS PASS — verified clean no-op');
  console.log(JSON.stringify({ results, changedFiles, mode: 'NO_OP' }, null, 2));
  process.exit(0);
}

const unexpected = changedFiles.filter((file) => !allowedFiles.has(file));
if (unexpected.length) {
  console.error(`[content-platform-presentation-defaults-phase-review] Unexpected changed files: ${unexpected.join(', ')}`);
  process.exit(1);
}
for (const required of allowedFiles) {
  if (!changedFiles.includes(required)) {
    console.error(`[content-platform-presentation-defaults-phase-review] Expected verified change missing: ${required}`);
    process.exit(1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', ...allowedFiles], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-platform-presentation-defaults-phase-review] Failed to stage verified files');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-platform-presentation-defaults-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify({ results, changedFiles, mode: 'APPLY' }, null, 2));
