import { readFile } from 'node:fs/promises';

const pathsManagerSource = await readFile(new URL('../dashboards/admin/PathsManager.tsx', import.meta.url), 'utf8');
const quizzesManagerSource = await readFile(new URL('../dashboards/admin/QuizzesManager.tsx', import.meta.url), 'utf8');
const learningSectionSource = await readFile(new URL('../components/LearningSection.tsx', import.meta.url), 'utf8');
const genericPathSource = await readFile(new URL('../pages/GenericPathPage.tsx', import.meta.url), 'utf8');
const mockExamManagerSource = await readFile(new URL('../dashboards/admin/MockExamManager.tsx', import.meta.url), 'utf8');
const mockExamsPageSource = await readFile(new URL('../pages/MockExams.tsx', import.meta.url), 'utf8');

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

check('subject workspace summary counts only explicitly selected training and test placements', () => {
  assertIncludes(pathsManagerSource, 'isSelectedForSubjectLearningSlot');
  assertIncludes(pathsManagerSource, "isQuizVisibleInLearningSlot(quiz, { pathId: subject.pathId, subjectId: subject.id, slot })");
  assertIncludes(pathsManagerSource, "training: quizzes.filter((quiz: any) => isSelectedForSubjectLearningSlot(quiz, currentSubject, 'training'))");
  assertIncludes(pathsManagerSource, "tests: quizzes.filter((quiz: any) => isSelectedForSubjectLearningSlot(quiz, currentSubject, 'tests'))");
  assertNotIncludes(
    pathsManagerSource,
    "training: quizzes.filter((quiz: any) => quiz.subjectId === currentSubject.id && isMaterialQuizCandidate(quiz) && isTrainingQuiz(quiz))",
    'training summary must not count every generally-classified training quiz',
  );
  assertNotIncludes(
    pathsManagerSource,
    "tests: quizzes.filter((quiz: any) => quiz.subjectId === currentSubject.id && isMaterialQuizCandidate(quiz) && isMockQuiz(quiz))",
    'test summary must not count every generally-classified test quiz',
  );
});

check('learning admin defaults to selected-only but can add from the central repository', () => {
  assertIncludes(quizzesManagerSource, "const [learningSlotFilter, setLearningSlotFilter] = useState<'all' | 'visible' | 'hidden'>(filterType ? 'visible' : 'all')");
  assertIncludes(quizzesManagerSource, "if (learningSlotFilter === 'visible' && !isVisibleHere) return false");
  assertIncludes(quizzesManagerSource, "if (learningSlotFilter === 'hidden' && isVisibleHere) return false");
  assertIncludes(quizzesManagerSource, 'الظاهر للطالب في {activeLearningSlotLabel} هو ما تم اختياره من هذه اللوحة فقط');
});

check('student pages read the same explicit placement source as admin', () => {
  assertIncludes(learningSectionSource, "getLearningSlotQuizzes(");
  assertIncludes(learningSectionSource, "{ pathId: category, subjectId: subject, slot: 'training' }");
  assertIncludes(learningSectionSource, "{ pathId: category, subjectId: subject, slot: 'tests' }");
  assertIncludes(learningSectionSource, 'true,');
  assertIncludes(genericPathSource, "getLearningSlotQuizzes(");
  assertIncludes(genericPathSource, '{ pathId: path.id, subjectId: scopedSubjectId, slot }');
  assertIncludes(genericPathSource, 'true,');
});

check('mock exam manager prepares Qiyas-style section skeletons without duplicating quizzes', () => {
  assertIncludes(mockExamManagerSource, 'buildQiyasSections');
  assertIncludes(mockExamManagerSource, "['رياضيات', 'math']");
  assertIncludes(mockExamManagerSource, "['فيزياء', 'physics']");
  assertIncludes(mockExamManagerSource, "['كيمياء', 'chemistry']");
  assertIncludes(mockExamManagerSource, "['أحياء', 'احياء', 'biology']");
  assertIncludes(mockExamManagerSource, "['كمي', 'الكمي', 'quant']");
  assertIncludes(mockExamManagerSource, "['لفظي', 'اللفظي', 'verbal']");
  assertIncludes(mockExamManagerSource, 'setSections(buildQiyasSections(selectedPathName, pathSubjects))');
  assertIncludes(mockExamManagerSource, 'هيكل قياس');
  assertIncludes(mockExamManagerSource, 'تجهيز أقسام القدرات أو التحصيلي حسب مواد المسار الحالية');
  assertIncludes(mockExamManagerSource, 'mockExam: { enabled: true, pathId: selectedPathId, sections: cleanSections }');
});

check('global mock exam page keeps mock exams available for every enabled path', () => {
  assertIncludes(mockExamsPageSource, 'const showMockEntry = path.settings?.showMockExamCard !== false');
  assertIncludes(mockExamsPageSource, '(canSeeHiddenPaths || path.isActive !== false)');
  assertIncludes(mockExamsPageSource, 'path.showInNavbar !== false');
  assertNotIncludes(mockExamsPageSource, 'isMockExamPath', 'mock exams should not be limited to Qudrat/Tahsili path names');
  assertNotIncludes(mockExamsPageSource, '(isMockExamPath(path.name) || hasMockExam)', 'empty paths still need a mock exam entry');
});

for (const item of checks) {
  console.log(`${item.status} ${item.name}${item.details ? ` - ${item.details}` : ''}`);
}

const failed = checks.filter((item) => item.status === 'FAIL');
if (failed.length > 0) {
  console.error(`\n${failed.length} learning placement admin contract check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} learning placement admin contract checks passed.`);
