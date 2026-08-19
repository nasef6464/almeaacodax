import { spawnSync } from 'node:child_process';

const applyLearningSchemas = spawnSync('node', ['tools/refactor/apply-content-learning-schemas.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applyLearningSchemas.status !== 0) {
  console.error('[content-learning-schemas-phase-review] Failed to apply learning content schema extraction');
  process.exit(applyLearningSchemas.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['learning content schema boundary', 'node', ['scripts/smoke-content-learning-schema-boundary-contract.mjs']],
  ['library support contract', 'npm', ['run', 'smoke:library-support']],
  ['video questions contract', 'npm', ['run', 'smoke:video-questions']],
  ['course visibility contract', 'npm', ['run', 'smoke:course-visibility']],
  ['student learning journey contract', 'npm', ['run', 'smoke:student-learning-journey']],
  ['school management contract', 'npm', ['run', 'smoke:school-management']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[content-learning-schemas-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
  if (result.status !== 0) {
    console.error(`\n[content-learning-schemas-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', 'server/src/routes/content.routes.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (stageVerifiedFiles.status !== 0) {
  console.error('[content-learning-schemas-phase-review] Failed to stage verified content route changes');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[content-learning-schemas-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
