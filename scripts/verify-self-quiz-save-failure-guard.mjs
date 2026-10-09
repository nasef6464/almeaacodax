#!/usr/bin/env node
// Read-only regression guard for the self-quiz result/attempt save boundary.
// This deliberately reports FAIL until the PR-owned Quiz.tsx path is repaired.
// No network, browser, database, or production access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const quiz = fs.readFileSync(path.join(root, 'pages/Quiz.tsx'), 'utf8');
const slice = fs.readFileSync(path.join(root, 'store/slices/learningInteractionsSlice.ts'), 'utf8');
const finishStart = quiz.indexOf('  const handleFinish =');
const finishEnd = quiz.indexOf('  const handleNext =', finishStart);
assert.ok(finishStart >= 0 && finishEnd > finishStart, 'Locate the current self-quiz finish handler');
const finish = quiz.slice(finishStart, finishEnd);
const saveStart = finish.indexOf('      saveExamResult({');
const catchStart = finish.indexOf('    } catch (err) {', saveStart);
const cleanupStart = finish.indexOf('    localStorage.removeItem(QUIZ_PROGRESS_KEY);', catchStart);
assert.ok(saveStart >= 0 && catchStart > saveStart && cleanupStart > catchStart,
  'Locate result persistence, error boundary and progress cleanup');

const checks = [
  {
    name: 'save failure retains resumable progress and does not navigate',
    pass: /\breturn\s*;/.test(finish.slice(catchStart, cleanupStart)),
    evidence: 'Catch must exit before clearing saved progress and navigating to results.',
  },
  {
    name: 'attempt evidence is not persisted before result acceptance',
    pass: !/recordQuestionAttempt\s*\(/.test(finish.slice(0, saveStart)),
    evidence: 'Attempts written before saveExamResult can survive a rejected result.',
  },
  {
    name: 'attempt persistence failures are observable to the caller',
    pass: !/api\.createQuestionAttempt\(serverAttempt\)\.catch\(console\.error\)/.test(slice),
    evidence: 'Detached .catch(console.error) cannot make result/attempt completion atomic.',
  },
];
const failures = checks.filter(({ pass }) => !pass);
console.log(JSON.stringify({
  phase: 'self-quiz-save-failure-source-regression',
  status: failures.length ? 'FAIL' : 'PASS',
  checks: checks.map(({ name, pass, evidence }) => ({ name, status: pass ? 'PASS' : 'FAIL', evidence })),
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
