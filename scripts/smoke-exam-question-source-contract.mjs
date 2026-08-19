import { readFile } from 'node:fs/promises';

const helperSource = await readFile(new URL('../utils/exams/questionBankSource.ts', import.meta.url), 'utf8').catch(() => '');
const quizBuilderSource = await readFile(new URL('../dashboards/admin/QuizBuilder.tsx', import.meta.url), 'utf8');
const barcodeSource = await readFile(new URL('../dashboards/admin/PublicBarcodeTestsManager.tsx', import.meta.url), 'utf8');
const mockSource = await readFile(new URL('../dashboards/admin/MockExamManager.tsx', import.meta.url), 'utf8');
const quizzesManagerSource = await readFile(new URL('../dashboards/admin/QuizzesManager.tsx', import.meta.url), 'utf8');
const quizRoutesSource = await readFile(new URL('../server/src/routes/quiz.routes.ts', import.meta.url), 'utf8');

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
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('shared exam question source reads approved questions from the real paginated API', () => {
  assertIncludes(helperSource, 'api.getQuestionsPaginated');
  assertIncludes(helperSource, "approvalStatus: 'approved'");
  assertIncludes(helperSource, 'pathId: filters.pathId');
  assertIncludes(helperSource, 'subject: filters.subjectId');
  assertIncludes(helperSource, 'sectionId: filters.sectionId');
  assertIncludes(helperSource, 'skillId: filters.skillId');
  assertIncludes(helperSource, 'search: filters.search');
});

for (const [name, source] of [
  ['normal quiz builder', quizBuilderSource],
  ['barcode tests manager', barcodeSource],
  ['mock exam manager', mockSource],
]) {
  check(`${name} uses the shared API-backed question source`, () => {
    assertIncludes(source, 'useExamQuestionBank');
    assertIncludes(source, 'questionBankQuestions');
    assertNotIncludes(source, 'questions.filter((question)', `${name} must not filter the useStore question snapshot`);
  });

  check(`${name} exposes the agreed empty-bank guidance`, () => {
    assertIncludes(source, 'EXAM_QUESTION_BANK_EMPTY_MESSAGE');
  });
}

check('directed exam entry opens an unsaved normalized draft instead of persisting zero questions', () => {
  assertIncludes(quizzesManagerSource, 'setDraftMode(mode)');
  assertIncludes(quizzesManagerSource, 'setEditingQuizId(null)');
  assertIncludes(quizzesManagerSource, 'setIsEditing(true)');
  assertIncludes(quizzesManagerSource, "defaultKind={draftMode === 'saher' || draftMode === 'central' ? 'test' : undefined}");
  assertIncludes(
    quizzesManagerSource,
    "initialMode={draftMode === 'saher' ? 'saher' : draftMode === 'central' || openedFromReports || openedFromSchoolPortal || isSupervisor ? 'central' : 'regular'}",
  );
  assertNotIncludes(quizzesManagerSource, 'addQuiz(draftQuiz)');
});

check('directed exam entry opens the builder form immediately', () => {
  assertIncludes(quizBuilderSource, 'useState(Boolean(initialMode || initialQuizId))');
});
check('normal quiz builder blocks saving without question ids', () => {
  assertIncludes(quizBuilderSource, 'if ((currentQuiz.questionIds || []).length === 0)');
  assertIncludes(quizBuilderSource, 'لا يمكن حفظ الاختبار بدون أسئلة.');
});

check('barcode creation remains blocked without selected question ids', () => {
  assertIncludes(barcodeSource, 'if (selectedQuestionIds.length === 0)');
  assertIncludes(barcodeSource, 'disabled={saving || selectedQuestionIds.length === 0}');
});

check('mock exam save remains blocked without real question ids', () => {
  assertIncludes(mockSource, 'if (allQuestionIds.length === 0)');
  assertIncludes(mockSource, 'لا يمكن حفظ الاختبار المحاكي بدون أسئلة.');
});

check('supervisors stay read-only in normal and barcode question selection', () => {
  assertIncludes(quizBuilderSource, 'const canCreateQuestions = user.role === Role.ADMIN || user.role === Role.TEACHER');
  assertIncludes(quizBuilderSource, 'isAddQuestionModalOpen && canCreateQuestions');
  assertIncludes(barcodeSource, "const canCreateQuestions = user.role === 'admin' || user.role === 'teacher'");
  assertIncludes(barcodeSource, 'showQuestionBuilder && canCreateQuestions');
});

check('learner quiz lists are audience-scoped and never share a public cache across signed-in students', () => {
  assertIncludes(quizRoutesSource, 'const canUsePublicCache = !req.authUser;');
  assertIncludes(quizRoutesSource, 'const learnerAudienceUser =');
  assertIncludes(quizRoutesSource, 'await resolveAuthUserByAuthId(String(req.authUser.id || ""))');
  assertIncludes(quizRoutesSource, 'isQuizTargetedToLearner(quiz, learnerAudienceUser)');
});

check('quiz submission result response is not broken by non-critical side effects', () => {
  assertIncludes(quizRoutesSource, 'const runQuizSubmissionSideEffects = async');
  assertIncludes(quizRoutesSource, 'Promise.allSettled');
  assertIncludes(quizRoutesSource, '[quiz-submit] non-critical side effect failed');
  assertIncludes(quizRoutesSource, 'return res.status(StatusCodes.CREATED).json(serializeQuizResultForLearner(result));');
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} exam question source contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} exam question source contract checks passed.`);