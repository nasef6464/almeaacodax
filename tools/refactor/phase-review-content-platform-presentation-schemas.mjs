import { spawnSync } from 'node:child_process';

for (const [label, script] of [
  ['platform integration schemas', 'tools/refactor/apply-content-platform-integration-schemas.mjs'],
  ['platform presentation schemas', 'tools/refactor/apply-content-platform-presentation-schemas.mjs'],
]) {
  const applied = spawnSync('node', [script], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (applied.status !== 0) {
    console.error(`[content-platform-presentation-schemas-phase-review] Failed to apply/confirm ${label}`);
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
  ['announcement ads contract', 'npm', ['run', 'smoke:announcement-ads']],
  ['platform fonts contract', 'npm', ['run', 'smoke:platform-fonts']],
  ['homepage hero contract', 'npm', ['run', 'smoke:homepage-hero']],
  ['typography contract', 'npm', ['run', 'smoke:typography']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-platform-presentation-schemas-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[content-platform-presentation-schemas-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', 'server/src/routes/content.routes.ts'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-platform-presentation-schemas-phase-review] Failed to stage verified route changes');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-platform-presentation-schemas-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
