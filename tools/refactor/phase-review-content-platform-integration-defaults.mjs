import { spawnSync } from 'node:child_process';

const apply = spawnSync('node', ['tools/refactor/apply-content-platform-integration-defaults.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (apply.status !== 0) {
  console.error('[content-platform-integration-defaults-phase-review] Apply/confirm failed');
  process.exit(apply.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['integration defaults boundary', 'node', ['scripts/smoke-content-platform-integration-defaults-boundary-contract.mjs']],
  ['integrations runtime contract', 'npm', ['run', 'smoke:integrations-runtime']],
  ['AI config bridge contract', 'npm', ['run', 'smoke:ai-config-bridge']],
  ['monitoring contract', 'npm', ['run', 'smoke:monitoring']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-platform-integration-defaults-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[content-platform-integration-defaults-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const allowedFiles = new Set([
  'server/src/routes/content.routes.ts',
  'server/src/modules/content/integrations/platformIntegrationDefaults.ts',
]);
const changed = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8', shell: process.platform === 'win32' });
const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (changed.status !== 0 || untracked.status !== 0) {
  console.error('[content-platform-integration-defaults-phase-review] Failed to inspect working-tree scope');
  process.exit(1);
}
const changedFiles = [...new Set(`${changed.stdout || ''}\n${untracked.stdout || ''}`.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
const unexpected = changedFiles.filter((file) => !allowedFiles.has(file));
if (unexpected.length) {
  console.error(`[content-platform-integration-defaults-phase-review] Unexpected changed files: ${unexpected.join(', ')}`);
  process.exit(1);
}
for (const required of allowedFiles) {
  if (!changedFiles.includes(required)) {
    console.error(`[content-platform-integration-defaults-phase-review] Expected verified change missing: ${required}`);
    process.exit(1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', ...allowedFiles], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-platform-integration-defaults-phase-review] Failed to stage verified files');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-platform-integration-defaults-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify({ results, changedFiles }, null, 2));
