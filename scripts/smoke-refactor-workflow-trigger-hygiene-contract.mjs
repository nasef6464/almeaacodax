import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requirePost = process.argv.includes('--require-post');

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

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const hasTopLevelPr = (source) => /^  pull_request:\s*$/m.test(source);
const hasWorkflowDispatch = (source) => /^  workflow_dispatch:\s*$/m.test(source);

const checks = [];
const check = (name, assertion) => {
  try { assertion(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) }); }
};

const sources = targetWorkflows.map((file) => ({ file, source: read(file) }));
const prCount = sources.filter(({ source }) => hasTopLevelPr(source)).length;
const dispatchCount = sources.filter(({ source }) => hasWorkflowDispatch(source)).length;
const mode = prCount === targetWorkflows.length
  ? 'PRE_HYGIENE'
  : prCount === 0 && dispatchCount === targetWorkflows.length
    ? 'POST_HYGIENE'
    : 'PARTIAL';

check('closed phase workflows are never left in a partially migrated trigger state', () => {
  if (mode === 'PARTIAL') {
    throw new Error(`Partial trigger migration: pull_request=${prCount}/${targetWorkflows.length}, workflow_dispatch=${dispatchCount}/${targetWorkflows.length}`);
  }
  if (requirePost && mode !== 'POST_HYGIENE') throw new Error(`Post-hygiene state required, got ${mode}`);
});

check('closed phase workflows keep safe branch scoped push verification', () => {
  for (const { file, source } of sources) {
    if (!/^  push:\s*$/m.test(source)) throw new Error(`${file} lost push trigger`);
    if (!source.includes('      - refactor/repository-v2-safe')) throw new Error(`${file} lost safe branch scope`);
    if (!/^    paths:\s*$/m.test(source)) throw new Error(`${file} lost push paths scope`);
    if (!source.includes('cancel-in-progress: true')) throw new Error(`${file} lost concurrency cancellation`);
  }
});

check('post-hygiene closed phases are manually runnable but not cumulative-PR triggered', () => {
  if (mode !== 'POST_HYGIENE') return;
  for (const { file, source } of sources) {
    if (hasTopLevelPr(source)) throw new Error(`${file} regained pull_request trigger`);
    if (!hasWorkflowDispatch(source)) throw new Error(`${file} lost workflow_dispatch`);
  }
});

check('central Safety Gate remains pull-request and safe-branch triggered', () => {
  const source = read('.github/workflows/refactor-v2-guard.yml');
  if (!/^  pull_request:\s*$/m.test(source)) throw new Error('Safety Gate lost pull_request trigger');
  if (!/^  push:\s*$/m.test(source)) throw new Error('Safety Gate lost push trigger');
  if (!source.includes('      - refactor/repository-v2-safe')) throw new Error('Safety Gate lost safe branch trigger');
  if (!source.includes('      - main')) throw new Error('Safety Gate lost main PR base');
});

check('dependency security audit remains pull-request triggered', () => {
  const source = read('.github/workflows/refactor-v2-dependency-audit.yml');
  if (!/^  pull_request:\s*$/m.test(source)) throw new Error('Dependency Audit lost pull_request trigger');
  if (!/^  push:\s*$/m.test(source)) throw new Error('Dependency Audit lost push trigger');
  if (!source.includes('      - refactor/repository-v2-safe')) throw new Error('Dependency Audit lost safe branch trigger');
  if (!source.includes("      - 'package-lock.json'")) throw new Error('Dependency Audit lost root lockfile scope');
  if (!source.includes("      - 'server/package-lock.json'")) throw new Error('Dependency Audit lost server lockfile scope');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'refactor-workflow-trigger-hygiene',
  status: failed.length ? 'FAIL' : 'PASS',
  mode,
  targetCount: targetWorkflows.length,
  pullRequestTriggerCount: prCount,
  workflowDispatchCount: dispatchCount,
  checks,
}, null, 2));
if (failed.length) process.exit(1);
