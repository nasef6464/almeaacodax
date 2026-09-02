import { readFile } from 'node:fs/promises';

const typeSource = await readFile(new URL('../types.ts', import.meta.url), 'utf8');
const mockUtilsSource = await readFile(new URL('../utils/mockExam.ts', import.meta.url), 'utf8');
const quizPlacementSource = await readFile(new URL('../utils/quizPlacement.ts', import.meta.url), 'utf8');
const adapterSource = await readFile(new URL('../services/adapter.ts', import.meta.url), 'utf8');
const learningPlacementSource = await readFile(new URL('../utils/quizLearningPlacement.ts', import.meta.url), 'utf8');
const adminSource = await readFile(new URL('../dashboards/admin/MockExamManager.tsx', import.meta.url), 'utf8');
const pathPageSource = await readFile(new URL('../pages/GenericPathPage.tsx', import.meta.url), 'utf8');
const mockPageSource = await readFile(new URL('../pages/MockExams.tsx', import.meta.url), 'utf8');
const quizPageSource = await readFile(new URL('../pages/QuizPage.tsx', import.meta.url), 'utf8');
const headerSource = await readFile(new URL('../components/Header.tsx', import.meta.url), 'utf8');
const frontendSmokeSource = await readFile(new URL('../scripts/smoke-frontend-routes.mjs', import.meta.url), 'utf8');

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

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
  }
}

check('mock exam data model is path-level with ordered sections from question bank refs', () => {
  assertIncludes(typeSource, 'export interface MockExamSection');
  assertIncludes(typeSource, 'subjectId?: string');
  assertIncludes(typeSource, 'questionIds: string[]');
  assertIncludes(typeSource, 'timeLimit?: number');
  assertIncludes(typeSource, 'export interface MockExamConfig');
  assertIncludes(typeSource, 'pathId: string');
  assertIncludes(typeSource, 'sections: MockExamSection[]');
});

check('mock exam utilities preserve modern quizKind mocks while excluding only legacy standalone mocks from material centers', () => {
  assertIncludes(mockUtilsSource, 'export const isPathMockExam');
  assertIncludes(mockUtilsSource, 'quiz.mockExam?.pathId === pathId || quiz.pathId === pathId');
  assertIncludes(mockUtilsSource, 'export const isStandaloneMockExam = (quiz: Quiz) => quiz.mockExam?.enabled === true');
  assertIncludes(mockUtilsSource, 'export const isMaterialQuizCandidate = (quiz: Quiz) => {');
  assertIncludes(mockUtilsSource, 'if (quiz.quizKind) return true');
  assertIncludes(mockUtilsSource, 'if (isStandaloneMockExam(quiz)) return false');
  assertIncludes(mockUtilsSource, 'flattenMockExamQuestionIds');
  assertIncludes(mockUtilsSource, 'getMockExamTimeLimit');
  assertIncludes(quizPlacementSource, "if (qk === 'mock')");
  assertIncludes(quizPlacementSource, "placement: 'mock' as Quiz['placement']");
  assertIncludes(quizPlacementSource, 'showInTraining: false');
  assertIncludes(quizPlacementSource, 'showInMock: true');
  assertIncludes(adapterSource, 'quizKind: ["drill", "test", "mock"].includes(quiz?.quizKind) ? quiz.quizKind : undefined');
});

check('explicit learning placements keep mock classification separate from subject learning visibility', () => {
  assertIncludes(learningPlacementSource, 'export const isQuizVisibleInLearningSlot');
  assertIncludes(learningPlacementSource, 'const placement = getQuizLearningPlacement(quiz, scope)');
  assertIncludes(learningPlacementSource, 'return placement ? placement.isVisible !== false : false');
  assertIncludes(learningPlacementSource, 'requireExplicitPlacement = false');
  assertIncludes(learningPlacementSource, 'hasExplicitPlacement || requireExplicitPlacement');
});

check('admin mock exam manager creates independent path mock exams from question center questions', () => {
  assertIncludes(adminSource, 'pathQuestions');
  assertIncludes(adminSource, 'useExamQuestionBank');
  assertIncludes(adminSource, 'const pathQuestions = questionBankQuestions');
  assertIncludes(adminSource, 'filterQuestionsForSection');
  assertIncludes(adminSource, 'skillFilter');
  assertIncludes(adminSource, 'difficultyFilter');
  assertIncludes(adminSource, 'toggleQuestion(section.id, question.id)');
});

check('admin mock exam save publishes a typed mock without training placement', () => {
  assertIncludes(adminSource, "quizKind: 'mock' as const");
  assertIncludes(adminSource, "mockExam: { enabled: true, pathId: selectedPathId, sections: cleanSections }");
  assertIncludes(adminSource, "placement: 'mock'");
  assertIncludes(adminSource, 'showInTraining: false');
  assertIncludes(adminSource, 'showInMock: true');
  assertIncludes(adminSource, 'questionIds: allQuestionIds');
  assertIncludes(adminSource, 'isPublished: true');
  assertIncludes(adminSource, 'showOnPlatform: isAdminPlatform');
  assertIncludes(adminSource, "approvalStatus: 'approved'");
});

check('path page exposes mock exam card and path tab as separate from subject tests', () => {
  assertIncludes(pathPageSource, "searchParams.get('tab') === 'mock-exams'");
  assertIncludes(pathPageSource, 'renderMockExamEntryCard');
  assertIncludes(pathPageSource, "to={`/category/${path.id}?tab=mock-exams`}");
  assertIncludes(pathPageSource, 'pathMockQuizzes');
  assertIncludes(pathPageSource, 'isPathMockExam(quiz, path.id) && canStudentSeeContent(quiz)');
  assertIncludes(pathPageSource, "source: 'mock-exam'");
});

check('global mock exam page is a simple path picker and links to the same path mock tab', () => {
  assertIncludes(mockPageSource, 'getVisibleMockExams');
  assertIncludes(mockPageSource, 'isPathMockExam(quiz, pathId)');
  assertIncludes(mockPageSource, 'showMockEntry');
  assertIncludes(mockPageSource, "to={`/category/${path.id}?tab=mock-exams`}");
  assertIncludes(mockPageSource, '<details');
});

check('quiz runner loads mock exam sections and resolves modern or legacy mock source consistently', () => {
  assertIncludes(quizPageSource, 'flattenMockExamQuestionIds(foundQuiz)');
  assertIncludes(quizPageSource, 'foundQuiz.mockExam?.enabled ? getMockExamTimeLimit(foundQuiz)');
  assertIncludes(quizPageSource, "quiz?.quizKind === 'mock' || quiz?.mockExam?.enabled");
  assertIncludes(quizPageSource, "return 'mock-exam'");
  assertIncludes(quizPageSource, "sourceParam === 'mock-exam'");
  assertIncludes(quizPageSource, 'mockExamSectionSummaries');
  assertIncludes(quizPageSource, 'currentMockExamSection');
});

check('header updates mock exam navigation when quiz data changes', () => {
  assertIncludes(headerSource, 'path.settings?.showMockExamCard !== false');
  assertNotIncludes(headerSource, 'isPathMockExam(quiz, path.id)');
  assertIncludes(headerSource, "id: 'mock-exams'");
  assertIncludes(headerSource, "link: '/mock-exams'");
  assertIncludes(headerSource, "[homepageSettings?.navigation, levels, paths, subjects, user?.role]");
});

check('frontend smoke covers global and per-path mock exam route shells', () => {
  assertIncludes(frontendSmokeSource, "'/#/mock-exams'");
  assertIncludes(frontendSmokeSource, "routes.push(`/#/category/${pathId}?tab=mock-exams`)");
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} mock exam contract smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} mock exam contract smoke checks passed.`);
