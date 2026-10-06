import { spawnSync } from 'node:child_process';

const applied = spawnSync('node', ['tools/refactor/apply-quiz-question-query-schemas.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (applied.status !== 0) {
  console.error('[quiz-question-query-schemas-phase-review] Failed to apply/confirm current phase');
  process.exit(applied.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['API typecheck', 'npm', ['run', 'server:check']],
  ['API production build', 'npm', ['run', 'server:build']],
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
  ['quiz question/query schema boundary', 'node', ['scripts/smoke-quiz-question-query-schema-boundary-contract.mjs']],
  ['quiz integrity guard', 'npm', ['run', 'smoke:quiz-integrity-guard']],
  ['quiz answer exposure', 'npm', ['run', 'smoke:quiz-answer-exposure']],
  ['quiz client security', 'npm', ['run', 'smoke:quiz-client-security']],
  ['question HTML security', 'npm', ['run', 'smoke:question-html-security']],
  ['my quizzes contract', 'npm', ['run', 'smoke:my-quizzes']],
  ['quiz access contract', 'npm', ['run', 'smoke:quiz-access']],
  ['global student journey contract', 'npm', ['run', 'smoke:global-student-journey']],
  ['student learning journey contract', 'npm', ['run', 'smoke:student-learning-journey']],
  ['results contract', 'npm', ['run', 'smoke:results']],
  ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
  ['API security contract', 'npm', ['run', 'smoke:api-security']],
  ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
  ['workflow race-safety contract', 'node', ['scripts/smoke-refactor-workflow-race-contract.mjs']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[quiz-question-query-schemas-phase-review] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[quiz-question-query-schemas-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const stageVerifiedFiles = spawnSync('git', ['add', 'server/src/routes/quiz.routes.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (stageVerifiedFiles.status !== 0) {
  console.error('[quiz-question-query-schemas-phase-review] Failed to stage verified route changes');
  process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[quiz-question-query-schemas-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
