import { spawnSync } from 'node:child_process';

for (const [label, script] of [
  ['learning content schemas', 'tools/refactor/apply-content-learning-schemas.mjs'],
  ['platform integration schemas', 'tools/refactor/apply-content-platform-integration-schemas.mjs'],
  ['platform presentation schemas', 'tools/refactor/apply-content-platform-presentation-schemas.mjs'],
  ['school operations schemas', 'tools/refactor/apply-content-school-operations-schemas.mjs'],
  ['study plan schemas', 'tools/refactor/apply-content-study-plan-schemas.mjs'],
]) {
  const applied = spawnSync('node', [script], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (applied.status !== 0) {
    console.error(`[content-study-plan-schemas-phase-review] Failed to apply/confirm ${label}`);
    process.exit(applied.status ?? 1);
  }
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['learning content schema boundary', 'node', ['scripts/smoke-content-learning-schema-boundary-contract.mjs']],
  ['platform integration schema boundary', 'node', ['scripts/smoke-content-platform-integration-schema-boundary-contract.mjs']],
  ['platform presentation schema boundary', 'node', ['scripts/smoke-content-platform-presentation-schema-boundary-contract.mjs']],
  ['school operations schema boundary', 'node', ['scripts/smoke-content-school-operations-schema-boundary-contract.mjs']],
  ['study plan schema boundary', 'node', ['scripts/smoke-content-study-plan-schema-boundary-contract.mjs']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
  ['student learning journey contract', 'npm', ['run', 'smoke:student-learning-journey']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-study-plan-schemas-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[content-study-plan-schemas-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', 'server/src/routes/content.routes.ts'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-study-plan-schemas-phase-review] Failed to stage verified route changes');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-study-plan-schemas-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
