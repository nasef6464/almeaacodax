import { readFile } from 'node:fs/promises';

const canonicalSource = await readFile(new URL('../utils/exams/assessmentQuestionSource.ts', import.meta.url), 'utf8');
const helperSource = await readFile(new URL('../utils/exams/questionBankSource.ts', import.meta.url), 'utf8').catch(() => '');
const smartSelectorSource = await readFile(new URL('../dashboards/admin/SmartQuestionSelector.tsx', import.meta.url), 'utf8');
const quizPageSource = await readFile(new URL('../pages/QuizPage.tsx', import.meta.url), 'utf8');
const quizBuilderSource = await readFile(new URL('../dashboards/admin/QuizBuilder.tsx', import.meta.url), 'utf8').catch(() => '');
const barcodeSource = await readFile(new URL('../dashboards/admin/PublicBarcodeTestsManager.tsx', import.meta.url), 'utf8').catch(() => '');
const mockSource = await readFile(new URL('../dashboards/admin/MockExamManager.tsx', import.meta.url), 'utf8').catch(() => '');
const quizzesManagerSource = await readFile(new URL('../dashboards/admin/QuizzesManager.tsx', import.meta.url), 'utf8').catch(() => '');
const quizRoutesSource = await readFile(new URL('../server/src/routes/quiz.routes.ts', import.meta.url), 'utf8').catch(() => '');
const querySchemaSource = await readFile(new URL('../server/src/modules/quizzes/http/questionQuerySchemas.ts', import.meta.url), 'utf8').catch(() => '');

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

check('canonical assessment question source owns paginated API access', () => {
  assertIncludes(canonicalSource, 'client.getQuestionsPaginated');
  assertIncludes(canonicalSource, 'approvalStatus: request.approvalStatus');
  assertIncludes(canonicalSource, 'const MAX_PAGE_LIMIT = 100');
  assertIncludes(querySchemaSource, 'max(100)');
});

check('canonical source can traverse the full scope without a fixed page-count cap', () => {
  assertIncludes(canonicalSource, 'async loadAll');
  assertIncludes(canonicalSource, 'while (true)');
  assertIncludes(canonicalSource, 'result.page >= result.totalPages');
  assertNotIncludes(canonicalSource, 'MAX_PAGES');
});

check('canonical source hydrates selected IDs in chunks and reports missing/duplicates', () => {
  assertIncludes(canonicalSource, 'async hydrateByIds');
  assertIncludes(canonicalSource, 'HYDRATE_CHUNK_SIZE');
  assertIncludes(canonicalSource, "ids: idsChunk.join(',')");
  assertIncludes(canonicalSource, 'missingIds');
  assertIncludes(canonicalSource, 'duplicateIds');
});

check('legacy exam question-bank helper delegates to the canonical source', () => {
  assertIncludes(helperSource, "from './assessmentQuestionSource'");
  assertIncludes(helperSource, 'assessmentQuestionSource.loadAll');
  assertNotIncludes(helperSource, "approvalStatus: 'approved'");
  assertNotIncludes(helperSource, 'api.getQuestionsPaginated');
  assertNotIncludes(helperSource, 'MAX_PAGES');
});

check('SmartQuestionSelector uses canonical paginated search and never assumes first 300 questions', () => {
  assertIncludes(smartSelectorSource, 'assessmentQuestionSource');
  assertIncludes(smartSelectorSource, '.searchPage({');
  assertIncludes(smartSelectorSource, '.hydrateByIds(selectedIds)');
  assertIncludes(smartSelectorSource, 'page: manualPage');
  assertNotIncludes(smartSelectorSource, '.loadAll({');
  assertNotIncludes(smartSelectorSource, 'limit: 300');
  assertNotIncludes(smartSelectorSource, 'api.getQuestions(');
  assertNotIncludes(smartSelectorSource, 'storeQuestions');
});

check('SmartQuestionSelector delegates filtering and paging to the API', () => {
  assertIncludes(smartSelectorSource, 'CLIENT_PAGE_SIZE = 100');
  assertIncludes(smartSelectorSource, 'visibleFilteredQuestions');
  assertIncludes(smartSelectorSource, 'totalManualPages');
  assertIncludes(smartSelectorSource, 'skillIds: mode === "skills"');
  assertIncludes(smartSelectorSource, 'difficulty: difficulty === "all"');
  assertIncludes(quizRoutesSource, 'if (query.skillIds)');
  assertIncludes(quizRoutesSource, 'scopeFilter.difficulty = query.difficulty');
});

check('SmartQuestionSelector surfaces selected-question integrity diagnostics', () => {
  assertIncludes(smartSelectorSource, 'missingSelectedIds');
  assertIncludes(smartSelectorSource, 'duplicateSelectedIds');
  assertIncludes(smartSelectorSource, 'سؤال غير متاح حاليًا');
});

for (const [name, source] of [
  ['normal quiz builder', quizBuilderSource],
  ['barcode tests manager', barcodeSource],
  ['mock exam manager', mockSource],
]) {
  check(`${name} uses the compatibility API-backed question source`, () => {
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

check('quiz submission result response delegates non-critical side effects', () => {
  assertIncludes(quizRoutesSource, 'import { runQuizSubmissionSideEffects, updateSkillProgressFromQuestionAttempt }');
  assertIncludes(quizRoutesSource, 'await runQuizSubmissionSideEffects({');
  assertIncludes(quizRoutesSource, 'return res.status(StatusCodes.CREATED).json(serializeQuizResultForLearner(result));');
});

check('runner hydrates missing quiz questions through the chunked canonical source', () => {
  assertIncludes(quizPageSource, "from '../utils/exams/assessmentQuestionSource'");
  assertIncludes(quizPageSource, 'assessmentQuestionSource.hydrateByIds(missingIds)');
  assertNotIncludes(quizPageSource, 'limit: Math.min(Math.max(missingIds.length, 20), 200)');
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
