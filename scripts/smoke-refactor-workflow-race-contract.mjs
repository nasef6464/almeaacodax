import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const guardWorkflow = readFileSync(path.join(root, '.github/workflows/refactor-v2-guard.yml'), 'utf8').replace(/\r\n/g, '\n');
const auditWorkflow = readFileSync(path.join(root, '.github/workflows/refactor-v2-audit.yml'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing workflow fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unsafe workflow fragment: ${fragment}`);
}

check('push and pull-request runs share the safe branch concurrency key', () => {
  assertIncludes(guardWorkflow, 'group: refactor-v2-${{ github.event.pull_request.head.ref || github.ref_name }}');
  assertIncludes(guardWorkflow, 'cancel-in-progress: true');
});

check('verification checks out the exact source head rather than a synthetic PR merge ref', () => {
  assertIncludes(guardWorkflow, 'ref: ${{ github.event.pull_request.head.sha || github.sha }}');
});

check('only the single winning non-bot verification run may mutate the refactor branch', () => {
  const guard = "if: github.actor != 'github-actions[bot]'";
  const occurrences = guardWorkflow.split(guard).length - 1;
  if (occurrences < 3) throw new Error(`Expected the non-bot write guard on all three mutation steps; found ${occurrences}`);
  assertNotIncludes(guardWorkflow, "if: github.event_name == 'pull_request' && github.actor != 'github-actions[bot]'");
});

check('verified auto-commit refuses to overwrite a branch that moved during review', () => {
  assertIncludes(guardWorkflow, 'EXPECTED_SHA="${{ github.event.pull_request.head.sha || github.sha }}"');
  assertIncludes(guardWorkflow, 'REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes(guardWorkflow, 'if [ "$REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
  assertIncludes(guardWorkflow, 'NEW_REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes(guardWorkflow, 'if [ "$NEW_REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
});

check('primary safety workflow never force-pushes the protected refactor branch', () => {
  assertNotIncludes(guardWorkflow, 'git push --force');
  assertNotIncludes(guardWorkflow, 'git push -f');
  assertNotIncludes(guardWorkflow, '--force-with-lease');
});

check('repository audit uses branch-scoped concurrency and exact trigger head', () => {
  assertIncludes(auditWorkflow, 'group: refactor-v2-repository-audit-${{ github.ref_name }}');
  assertIncludes(auditWorkflow, 'cancel-in-progress: true');
  assertIncludes(auditWorkflow, 'ref: ${{ github.sha }}');
  assertNotIncludes(auditWorkflow, 'ref: refactor/repository-v2-safe', 'Audit workflow must not checkout a moving branch ref.');
});

check('repository audit refuses to commit stale generated evidence', () => {
  assertIncludes(auditWorkflow, 'EXPECTED_SHA="${{ github.sha }}"');
  assertIncludes(auditWorkflow, 'REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes(auditWorkflow, 'if [ "$REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
  assertIncludes(auditWorkflow, 'NEW_REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes(auditWorkflow, 'if [ "$NEW_REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
  assertIncludes(auditWorkflow, 'git add docs/architecture/generated');
});

check('repository audit never force-pushes the protected refactor branch', () => {
  assertNotIncludes(auditWorkflow, 'git push --force');
  assertNotIncludes(auditWorkflow, 'git push -f');
  assertNotIncludes(auditWorkflow, '--force-with-lease');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'refactor-workflow-race-safety',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
