import { spawnSync } from 'node:child_process';

for (const [label, script] of [
  ['learning content schemas', 'tools/refactor/apply-content-learning-schemas.mjs'],
  ['platform integration schemas', 'tools/refactor/apply-content-platform-integration-schemas.mjs'],
  ['platform presentation schemas', 'tools/refactor/apply-content-platform-presentation-schemas.mjs'],
  ['school operations schemas', 'tools/refactor/apply-content-school-operations-schemas.mjs'],
]) {
  const applied = spawnSync('node', [script], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (applied.status !== 0) {
    console.error(`[content-school-operations-schemas-phase-review] Failed to apply/confirm ${label}`);
    process.exit(applied.status ?? 1);
  }
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['platform integration schema boundary', 'node', ['scripts/smoke-content-platform-integration-schema-boundary-contract.mjs']],
  ['platform presentation schema boundary', 'node', ['scripts/smoke-content-platform-presentation-schema-boundary-contract.mjs']],
  ['school operations schema boundary', 'node', ['scripts/smoke-content-school-operations-schema-boundary-contract.mjs']],
  ['school management contract', 'node', ['scripts/smoke-school-management-contract.mjs']],
  ['school import parsing contract', 'npm', ['run', 'smoke:schools-import-parsing']],
  ['school package revenue contract', 'node', ['scripts/smoke-package-revenue-contract.mjs']],
  ['school admin relationship contract', 'node', ['scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs']],
  ['school relationship audit contract', 'node', ['scripts/smoke-batch100f-relationship-audit-contract.mjs']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-school-operations-schemas-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[content-school-operations-schemas-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', 'server/src/routes/content.routes.ts'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-school-operations-schemas-phase-review] Failed to stage verified route changes');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-school-operations-schemas-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
