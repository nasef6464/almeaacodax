import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

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

const normalize = (source) => source.replace(/\r\n/g, '\n');
const hasTopLevelPr = (source) => /^  pull_request:\s*$/m.test(source);
const hasWorkflowDispatch = (source) => /^  workflow_dispatch:\s*$/m.test(source);

const readTargets = () => targetWorkflows.map((file) => ({
  file,
  source: normalize(fs.readFileSync(path.join(root, file), 'utf8')),
}));

const before = readTargets();
const prCount = before.filter(({ source }) => hasTopLevelPr(source)).length;
const dispatchCount = before.filter(({ source }) => hasWorkflowDispatch(source)).length;

for (const { file, source } of before) {
  if (!/^  push:\s*$/m.test(source)) throw new Error(`${file} lost safe-branch push trigger.`);
  if (!source.includes('      - refactor/repository-v2-safe')) throw new Error(`${file} does not target refactor/repository-v2-safe.`);
  if (!/^    paths:\s*$/m.test(source)) throw new Error(`${file} lost scoped push paths.`);
}

if (prCount === 0 && dispatchCount === targetWorkflows.length) {
  console.log(JSON.stringify({
    status: 'ALREADY_APPLIED',
    phase: 'workflow-trigger-hygiene',
    targets: targetWorkflows.length,
  }, null, 2));
  process.exit(0);
}

if (prCount !== targetWorkflows.length) {
  throw new Error(`Workflow trigger hygiene is partially applied: ${prCount}/${targetWorkflows.length} still have pull_request.`);
}

function removePullRequestBlock(source, file) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === '  pull_request:');
  if (start < 0) throw new Error(`${file} has no pull_request block to remove.`);

  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line === '' || /^ {4,}\S/.test(line)) {
      end += 1;
      continue;
    }
    break;
  }

  lines.splice(start, end - start);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

for (const { file, source } of before) {
  let next = removePullRequestBlock(source, file);
  if (!hasWorkflowDispatch(next)) {
    if (!next.includes('on:\n')) throw new Error(`${file} lost top-level on block.`);
    next = next.replace('on:\n', 'on:\n  workflow_dispatch:\n');
  }

  if (hasTopLevelPr(next)) throw new Error(`${file} still has pull_request after transformation.`);
  if (!hasWorkflowDispatch(next)) throw new Error(`${file} is not manually dispatchable after transformation.`);
  if (!/^  push:\s*$/m.test(next)) throw new Error(`${file} lost push trigger during transformation.`);
  if (!next.includes('      - refactor/repository-v2-safe')) throw new Error(`${file} lost safe branch during transformation.`);
  if (!/^    paths:\s*$/m.test(next)) throw new Error(`${file} lost scoped push paths during transformation.`);

  fs.writeFileSync(path.join(root, file), next);
}

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'workflow-trigger-hygiene',
  targets: targetWorkflows.length,
  removedPullRequestTriggers: targetWorkflows.length,
  addedWorkflowDispatch: targetWorkflows.length - dispatchCount,
}, null, 2));
