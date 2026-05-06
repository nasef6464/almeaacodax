import { readFile } from 'node:fs/promises';

const typeSource = await readFile(new URL('../types.ts', import.meta.url), 'utf8');
const learningSectionSource = await readFile(new URL('../components/LearningSection.tsx', import.meta.url), 'utf8');
const quizBuilderSource = await readFile(new URL('../dashboards/admin/QuizBuilder.tsx', import.meta.url), 'utf8');
const quizzesManagerSource = await readFile(new URL('../dashboards/admin/QuizzesManager.tsx', import.meta.url), 'utf8');

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
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertPattern(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message || `Missing pattern: ${pattern}`);
  }
}

check('quiz access model supports free, paid, private, and course-only access', () => {
  assertIncludes(typeSource, "type: 'free' | 'paid' | 'private' | 'course_only'");
  assertIncludes(typeSource, 'price?: number');
  assertIncludes(typeSource, 'allowedGroupIds?: string[]');
  assertIncludes(typeSource, "export type PackageContentType = 'courses' | 'foundation' | 'banks' | 'tests' | 'library' | 'all'");
});

check('quiz builder exposes the four access states with package and group controls', () => {
  assertIncludes(quizBuilderSource, '<option value="free">');
  assertIncludes(quizBuilderSource, '<option value="paid">');
  assertIncludes(quizBuilderSource, '<option value="private">');
  assertIncludes(quizBuilderSource, '<option value="course_only">');
  assertIncludes(quizBuilderSource, "currentQuiz.access?.type === 'paid'");
  assertIncludes(quizBuilderSource, 'price: Number(e.target.value)');
  assertIncludes(quizBuilderSource, "currentQuiz.access?.type === 'private'");
  assertIncludes(quizBuilderSource, 'allowedGroupIds: values');
});

check('quiz builder keeps publish and platform visibility separate', () => {
  assertIncludes(quizBuilderSource, 'checked={currentQuiz.isPublished || false}');
  assertIncludes(quizBuilderSource, 'isPublished: e.target.checked');
  assertIncludes(quizBuilderSource, 'checked={currentQuiz.showOnPlatform !== false}');
  assertIncludes(quizBuilderSource, 'showOnPlatform: e.target.checked');
});

check('student learning area resolves bank and test package access independently', () => {
  assertIncludes(learningSectionSource, "hasScopedPackageAccess('banks', category, subject)");
  assertIncludes(learningSectionSource, "hasScopedPackageAccess('tests', category, subject)");
  assertIncludes(learningSectionSource, 'isQuizLockedForStudent(q, hasBanksAccess)');
  assertIncludes(learningSectionSource, 'isQuizLockedForStudent(q, hasTestsAccess)');
});

check('student quiz locking keeps free open, private audience-only, and paid/package gated', () => {
  assertIncludes(learningSectionSource, "const getQuizAccessType = (quiz: (typeof quizzes)[number]) => quiz.access?.type || 'free'");
  assertIncludes(learningSectionSource, "if (accessType === 'free') return false");
  assertIncludes(learningSectionSource, "if (accessType === 'private') return !isQuizAudienceAllowed(quiz)");
  assertIncludes(learningSectionSource, 'return !hasPackageAccess');
});

check('locked learning quizzes open the matching package flow for bank and test slots', () => {
  assertIncludes(learningSectionSource, "bank: 'banks'");
  assertIncludes(learningSectionSource, "test: 'tests'");
  assertIncludes(learningSectionSource, 'openScopedPackageForType(matchedType, item, type)');
  assertIncludes(learningSectionSource, "onLockedClick={(test) => handleItemClick(test, 'bank')}");
  assertIncludes(learningSectionSource, "onLockedClick={(test) => handleItemClick(test, 'test')}");
});

check('learning-space admin chooses what appears in training and tests per material', () => {
  assertIncludes(quizzesManagerSource, "activeLearningSlot: LearningPlacementSlot | null = filterType === 'bank' ? 'training' : filterType === 'quiz' ? 'tests' : null");
  assertIncludes(quizzesManagerSource, 'isQuizVisibleInLearningSlot(quiz, activeLearningScope)');
  assertIncludes(quizzesManagerSource, 'setQuizLearningSlotVisibility(');
  assertIncludes(quizzesManagerSource, 'showOnPlatform: !isVisibleHere ? true : quiz.showOnPlatform');
  assertIncludes(quizzesManagerSource, 'isPublished: !isVisibleHere ? true : quiz.isPublished');
  assertIncludes(quizzesManagerSource, "approvalStatus: !isVisibleHere ? 'approved' : quiz.approvalStatus");
});

check('admin quiz readiness catches missing publication requirements before student visibility', () => {
  assertIncludes(quizzesManagerSource, 'getQuizReadinessMeta');
  assertIncludes(quizzesManagerSource, 'questionCount === 0');
  assertIncludes(quizzesManagerSource, 'measuredSkillIds.length === 0');
  assertIncludes(quizzesManagerSource, "quiz.mode || 'regular') === 'central'");
  assertPattern(
    quizzesManagerSource,
    /isVisible && \(!quiz\.isPublished \|\| !isApproved\)/,
    'visible quizzes must be published and approved before being considered ready',
  );
});

check('admin labels paid, private, course-only, central, and free access clearly', () => {
  assertIncludes(quizzesManagerSource, "quiz.access.type === 'paid'");
  assertIncludes(quizzesManagerSource, "quiz.access.type === 'private'");
  assertIncludes(quizzesManagerSource, "quiz.access.type === 'course_only'");
  assertIncludes(quizzesManagerSource, "(quiz.mode || 'regular') === 'central'");
  assertIncludes(quizzesManagerSource, "return { label: 'مفتوح للعرض'");
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} quiz access contract smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} quiz access contract smoke checks passed.`);
