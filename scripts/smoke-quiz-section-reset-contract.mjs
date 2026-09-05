import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../pages/QuizPage.tsx', import.meta.url), 'utf8');
const checks = [];
const check = (name, assertion) => {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
};
const assertIncludes = (fragment) => {
  if (!source.includes(fragment)) throw new Error(`Missing fragment: ${fragment}`);
};

check('loading a different quiz clears per-attempt section state', () => {
  const loadReset = source.slice(source.indexOf('activeQuizLoadKeyRef.current = quizLoadKey;'), source.indexOf('const effectiveTimeLimit', source.indexOf('activeQuizLoadKeyRef.current = quizLoadKey;')));
  assertIncludes('setLockedSectionIds(new Set());');
  assertIncludes('setQuestionTimeSpent({});');
  if (!loadReset.includes('setLockedSectionIds(new Set());') || !loadReset.includes('setQuestionTimeSpent({});')) {
    throw new Error('quiz load must reset locked sections and question timing');
  }
});
check('restarting a quiz resets section locks and its first section timer', () => {
  const restart = source.slice(source.indexOf('const handleRestartQuiz = () =>'), source.indexOf('\n\n  if (hasAccess === null)'));
  if (!restart.includes('setLockedSectionIds(new Set());') || !restart.includes('setQuestionTimeSpent({});')) {
    throw new Error('restart must clear attempt-specific section state');
  }
  assertIncludes('const firstMockSection = getMockExamSections(quiz)[0];');
  assertIncludes('setSectionTimeLeft(firstSectionTimeLimit > 0 ? firstSectionTimeLimit * 60 : null);');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'quiz-section-reset', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
