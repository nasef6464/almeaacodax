import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const assertIncludes = (path, needle, message) => {
  const source = read(path);
  if (!source.includes(needle)) {
    throw new Error(`${message}\nMissing in ${path}: ${needle}`);
  }
};

const assertMatches = (path, pattern, message) => {
  const source = read(path);
  if (!pattern.test(source)) {
    throw new Error(`${message}\nPattern not found in ${path}: ${pattern}`);
  }
};

assertIncludes(
  'services/api.ts',
  'getQuestionsPaginated',
  'Question bank must keep using the paginated question helper.',
);
assertIncludes(
  'services/api.ts',
  'paginate: true',
  'Question bank pagination helper must send paginate=true.',
);
assertIncludes(
  'services/api.ts',
  'createQuestion: (payload: unknown',
  'Question API client must expose createQuestion.',
);
assertIncludes(
  'services/api.ts',
  'updateQuestion: (id: string',
  'Question API client must expose updateQuestion.',
);
assertIncludes(
  'services/api.ts',
  'deleteQuestion: (id: string',
  'Question API client must expose deleteQuestion.',
);

assertMatches(
  'store/useStore.ts',
  /addQuestion:\s*async[\s\S]*await api\.createQuestion[\s\S]*questions: \[normalizedQuestion,/,
  'Store addQuestion must await the backend and prepend the persisted question.',
);
assertMatches(
  'store/useStore.ts',
  /updateQuestion:\s*async[\s\S]*await api\.updateQuestion[\s\S]*questions: state\.questions\.map/,
  'Store updateQuestion must await the backend and update local state from the persisted response.',
);
assertMatches(
  'store/useStore.ts',
  /deleteQuestion:\s*async[\s\S]*await api\.deleteQuestion[\s\S]*questions: state\.questions\.filter/,
  'Store deleteQuestion must await the backend before removing local state.',
);

assertMatches(
  'dashboards/admin/QuestionBankManager.tsx',
  /const loadPagedQuestions = async[\s\S]*api\.getQuestionsPaginated\(\{[\s\S]*pathId: selectedPathId \|\| undefined,[\s\S]*subject: \(subjectId \|\| selectedSubjectId\) \|\| undefined,[\s\S]*sectionId: selectedSectionId \|\| undefined,[\s\S]*skillId: selectedSkillId \|\| undefined,[\s\S]*search: searchTerm \|\| undefined,/,
  'Question bank must load paginated questions with path, subject, section, skill, and search filters.',
);
assertIncludes(
  'dashboards/admin/QuestionBankManager.tsx',
  'questionsRefreshKey]',
  'Question bank paginated loader must depend on the refresh key.',
);
assertIncludes(
  'dashboards/admin/QuestionBankManager.tsx',
  'const refreshPagedQuestions = () => setQuestionsRefreshKey',
  'Question bank must expose a refresh helper after runtime mutations.',
);
assertMatches(
  'dashboards/admin/QuestionBankManager.tsx',
  /const handleDelete = async[\s\S]*await deleteQuestion\(id\);[\s\S]*refreshPagedQuestions\(\);[\s\S]*setImportError/,
  'Question deletion must await the backend, refresh the list, and surface failures.',
);
assertMatches(
  'dashboards/admin/QuestionBankManager.tsx',
  /const handleSave = async[\s\S]*await updateQuestion\(currentQuestion\.id[\s\S]*refreshPagedQuestions\(\);[\s\S]*await addQuestion\(/,
  'Question save must await update/create and refresh the paginated list.',
);
assertIncludes(
  'dashboards/admin/QuestionBankManager.tsx',
  'setCurrentPage(1);',
  'Creating a question must return the admin to the first page where the newest item appears.',
);
assertMatches(
  'dashboards/admin/QuestionBankManager.tsx',
  /const handleApprove = async[\s\S]*await updateQuestion\(question\.id,[\s\S]*approvalStatus: 'approved'[\s\S]*refreshPagedQuestions\(\);[\s\S]*setImportError/,
  'Approving a question must await update, refresh the list, and surface failures.',
);
assertMatches(
  'dashboards/admin/QuestionBankManager.tsx',
  /const handleReject = async[\s\S]*await updateQuestion\(question\.id,[\s\S]*approvalStatus: 'rejected'[\s\S]*refreshPagedQuestions\(\);[\s\S]*setImportError/,
  'Rejecting a question must await update, refresh the list, and surface failures.',
);
assertIncludes(
  'dashboards/admin/QuestionBankManager.tsx',
  "placeholder=\"ابحث في نص السؤال...\"",
  'Question bank must keep the visible search filter.',
);

assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'if (query.approvalStatus && isStaffRole(req.authUser?.role)) scopeFilter.approvalStatus = query.approvalStatus;',
  'Question approvalStatus filtering must stay restricted to staff.',
);
assertMatches(
  'server/src/routes/quiz.routes.ts',
  /if \(query\.search\) \{[\s\S]*const safeSearch = escapeRegex\(query\.search\);[\s\S]*\$regex: safeSearch/,
  'Question search filter must escape regex metacharacters before querying MongoDB.',
);
assertMatches(
  'server/src/routes/quiz.routes.ts',
  /quizRouter\.post\([\s\S]*"\/questions"[\s\S]*requireAuth[\s\S]*requireRole\(\["admin", "teacher", "supervisor"\]\)/,
  'Question creation route must require authenticated admin/teacher/supervisor access.',
);
assertMatches(
  'server/src/routes/quiz.routes.ts',
  /quizRouter\.patch\([\s\S]*"\/questions\/:id"[\s\S]*requireAuth[\s\S]*sanitizeWorkflowUpdate/,
  'Question update route must require auth and sanitize workflow updates.',
);
assertMatches(
  'server/src/routes/quiz.routes.ts',
  /quizRouter\.delete\([\s\S]*"\/questions\/:id"[\s\S]*requireAuth[\s\S]*findOneAndDelete/,
  'Question deletion route must require auth and delete only the owned/scoped document.',
);
assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'data: items',
  'Paginated question response must include the data array.',
);
assertIncludes(
  'server/src/routes/quiz.routes.ts',
  'pagination: {',
  'Paginated question response must include pagination metadata.',
);

console.log('BATCH100P contract passed: admin question bank runtime CRUD is guarded.');
