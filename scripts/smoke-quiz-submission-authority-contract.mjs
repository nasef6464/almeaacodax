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
const assertNotIncludes = (fragment) => {
  if (source.includes(fragment)) throw new Error(`Unexpected fragment: ${fragment}`);
};

check('non-development submissions require a server-confirmed result', () => {
  assertIncludes('let submissionSucceeded = false;');
  assertIncludes('const serverResult = await api.submitQuiz(quiz.id, {');
  assertIncludes('submissionSucceeded = true;');
  assertIncludes('if (!submissionSucceeded) {\n      return;\n    }');
});
check('failed server submissions keep progress instead of publishing a local result', () => {
  assertIncludes("console.error('Unable to submit quiz on server; keeping local progress for a retry:', error);");
  assertIncludes("showQuizStatus('تعذر إرسال النتيجة. تم الاحتفاظ بتقدمك لإعادة المحاولة.', 'info');");
  assertNotIncludes("Unable to submit quiz on server, saving local result instead:");
});
check('development sessions retain their explicit local-only compatibility path', () => {
  assertIncludes('if (isDevSessionUser(user)) {');
  assertIncludes('saveExamResult(result);');
});

const failed = checks.filter((item) => item.status === 'FAIL');
console.log(JSON.stringify({ phase: 'quiz-submission-authority', status: failed.length ? 'FAIL' : 'PASS', checks }, null, 2));
if (failed.length) process.exit(1);
