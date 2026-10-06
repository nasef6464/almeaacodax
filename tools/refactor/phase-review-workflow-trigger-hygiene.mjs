import { spawnSync } from 'node:child_process';

const targetWorkflows = [
  '.github/workflows/refactor-v2-api-query-utilities.yml',
  '.github/workflows/refactor-v2-content-platform-integration-defaults.yml',
  '.github/workflows/refactor-v2-content-platform-presentation-defaults.yml',
  '.github/workflows/refactor-v2-content-study-plan-schemas.yml',
  '.github/workflows/refactor-v2-quiz-definition-schema.yml',
  '.github/workflows/refactor-v2-quiz-query-utilities.yml',
  '.github/workflows/refactor-v2-quiz-question-presentation.yml',
  '.github/workflows/refactor-v2-quiz-question-query-schemas.yml',
  '.github/workflows/refactor-v2-quiz-skill-analytics.yml',
  '.github/workflows/refactor-v2-quiz-submission-schemas.yml',
  '.github/workflows/refactor-v2-remediate-express-body-parser.yml',
  '.github/workflows/refactor-v2-remediate-express-rate-limit.yml',
  '.github/workflows/refactor-v2-remediate-google-genai.yml',
  '.github/workflows/refactor-v2-remediate-mongoose.yml',
  '.github/workflows/refactor-v2-remediate-postcss.yml',
  '.github/workflows/refactor-v2-remediate-react-router.yml',
  '.github/workflows/refactor-v2-remediate-root-babel-core.yml',
  '.github/workflows/refactor-v2-remediate-root-brace-expansion.yml',
  '.github/workflows/refactor-v2-remediate-root-fast-uri.yml',
  '.github/workflows/refactor-v2-remediate-sentry-brace-expansion.yml',
  '.github/workflows/refactor-v2-remediate-socket-io.yml',
  '.github/workflows/refactor-v2-remediate-vite.yml',
  '.github/workflows/refactor-v2-store-domain-helpers.yml',
];

const apply = spawnSync('node', ['tools/refactor/apply-workflow-trigger-hygiene.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (apply.status !== 0) {
  console.error('[workflow-trigger-hygiene-phase-review] Apply/confirm failed');
  process.exit(apply.status ?? 1);
}

const checks = [
  ['git diff whitespace validation', 'git', ['diff', '--check']],
  ['post-hygiene trigger contract', 'node', ['scripts/smoke-refactor-workflow-trigger-hygiene-contract.mjs', '--require-post']],
  ['existing workflow race-safety contract', 'node', ['scripts/smoke-refactor-workflow-race-contract.mjs']],
];

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[workflow-trigger-hygiene-phase-review] START ${name}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs: Date.now() - startedAt });
  if (result.status !== 0) {
    console.error(`\n[workflow-trigger-hygiene-phase-review] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

const changed = spawnSync('git', ['diff', '--name-only'], { encoding: 'utf8', shell: process.platform === 'win32' });
const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (changed.status !== 0 || untracked.status !== 0) {
  console.error('[workflow-trigger-hygiene-phase-review] Failed to inspect working-tree scope');
  process.exit(1);
}
const changedFiles = [...new Set(`${changed.stdout || ''}\n${untracked.stdout || ''}`.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];

if (changedFiles.length === 0) {
  console.log('\n[workflow-trigger-hygiene-phase-review] ALL CHECKS PASS — verified clean no-op');
  console.log(JSON.stringify({ results, changedFiles, mode: 'NO_OP' }, null, 2));
  process.exit(0);
}

const allowed = new Set(targetWorkflows);
const unexpected = changedFiles.filter((file) => !allowed.has(file));
if (unexpected.length) {
  console.error(`[workflow-trigger-hygiene-phase-review] Unexpected changed files: ${unexpected.join(', ')}`);
  process.exit(1);
}
if (changedFiles.length !== targetWorkflows.length) {
  console.error(`[workflow-trigger-hygiene-phase-review] Partial migration: expected ${targetWorkflows.length} changed workflows, found ${changedFiles.length}`);
  process.exit(1);
}
for (const required of targetWorkflows) {
  if (!changedFiles.includes(required)) {
    console.error(`[workflow-trigger-hygiene-phase-review] Expected workflow change missing: ${required}`);
    process.exit(1);
  }
}

const stage = spawnSync('git', ['add', ...targetWorkflows], { stdio: 'inherit', shell: process.platform === 'win32' });
if (stage.status !== 0) {
  console.error('[workflow-trigger-hygiene-phase-review] Failed to stage verified workflow files');
  process.exit(stage.status ?? 1);
}

console.log('\n[workflow-trigger-hygiene-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify({ results, changedFiles, mode: 'APPLY' }, null, 2));
