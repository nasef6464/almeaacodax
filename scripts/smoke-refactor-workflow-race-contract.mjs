import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflow = readFileSync(path.join(root, '.github/workflows/refactor-v2-guard.yml'), 'utf8').replace(/\r\n/g, '\n');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(fragment, message) {
  if (!workflow.includes(fragment)) throw new Error(message || `Missing workflow fragment: ${fragment}`);
}

function assertNotIncludes(fragment, message) {
  if (workflow.includes(fragment)) throw new Error(message || `Unsafe workflow fragment: ${fragment}`);
}

check('push and pull-request runs share the safe branch concurrency key', () => {
  assertIncludes('group: refactor-v2-${{ github.event.pull_request.head.ref || github.ref_name }}');
  assertIncludes('cancel-in-progress: true');
});

check('verification checks out the exact source head rather than a synthetic PR merge ref', () => {
  assertIncludes('ref: ${{ github.event.pull_request.head.sha || github.sha }}');
});

check('automatic refactor writes are restricted to pull-request verification runs', () => {
  const guard = "if: github.event_name == 'pull_request' && github.actor != 'github-actions[bot]'";
  const occurrences = workflow.split(guard).length - 1;
  if (occurrences < 3) throw new Error(`Expected the PR-only write guard on all three mutation steps; found ${occurrences}`);
});

check('verified auto-commit refuses to overwrite a branch that moved during review', () => {
  assertIncludes('EXPECTED_SHA="${{ github.event.pull_request.head.sha }}"');
  assertIncludes('REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes('if [ "$REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
  assertIncludes('NEW_REMOTE_SHA="$(git rev-parse origin/refactor/repository-v2-safe)"');
  assertIncludes('if [ "$NEW_REMOTE_SHA" != "$EXPECTED_SHA" ]; then');
});

check('workflow never force-pushes the protected refactor branch', () => {
  assertNotIncludes('git push --force');
  assertNotIncludes('git push -f');
  assertNotIncludes('--force-with-lease');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({
  phase: 'refactor-workflow-race-safety',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks,
}, null, 2));

if (failed.length > 0) process.exit(1);
